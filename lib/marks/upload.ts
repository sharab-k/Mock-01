import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { bulkSaveMarksAction } from '@/lib/actions/marks'
import { loadStudentLookup, resolveStudent } from '@/lib/uploads/students'
import { parseDate, pick, todayIso, type SheetRow } from '@/lib/uploads/sheet'

export type UploadRowError = { row: number; message: string }
export type MarksUploadResult = {
  totalRows: number
  saved: number
  inserted: number
  updated: number
  skipped: number
  errors: UploadRowError[]
}

const GR_COLS = ['grno', 'grnumber', 'gr', 'grn', 'registrationno']
const ROLL_COLS = ['rollno', 'rollnumber', 'roll']
const SUBJECT_COLS = ['subject']
const EXAM_COLS = ['exam', 'examtype', 'type', 'test']
const SCORE_COLS = ['marks', 'score', 'obtained', 'obtainedmarks', 'marksobtained']
const TOTAL_COLS = ['total', 'totalmarks', 'max', 'maxmarks', 'outof', 'maximum']
const DATE_COLS = ['examdate', 'date', 'dateofexam']

const EXAM_TYPES: Record<string, 'monthly' | 'half_yearly' | 'final'> = {
  monthly: 'monthly', month: 'monthly', m: 'monthly',
  halfyearly: 'half_yearly', half: 'half_yearly', h: 'half_yearly', halfyear: 'half_yearly',
  final: 'final', f: 'final', annual: 'final',
}

type Pending = { row: number; studentId: string; studentName: string; score: number }

// Validates every row of a marks spreadsheet, then saves the good ones through
// the same bulkSaveMarksAction the entry screens use — so edit history, the
// parent grade alerts and the audit log all behave exactly as for typed entry.
// A bad row is reported with its row number and skipped; it never blocks the
// rest of the file.
export async function processMarksUpload(
  supabase: SupabaseClient<Database>,
  rows: SheetRow[],
): Promise<MarksUploadResult> {
  const errors: UploadRowError[] = []
  const today = todayIso()

  const [{ data: subjectRows }, lookup] = await Promise.all([
    supabase.from('subjects').select('name, grade_level'),
    loadStudentLookup(supabase, rows.map((r) => pick(r.cells, GR_COLS)), rows.map((r) => pick(r.cells, ROLL_COLS))),
  ])
  const subjectByGrade = new Map<string, string>()
  for (const s of subjectRows ?? []) subjectByGrade.set(`${s.grade_level}|${s.name.trim().toLowerCase()}`, s.name)

  // One group per (subject, exam type, total, date) — the unit bulkSaveMarksAction takes.
  const groups = new Map<string, { subject: string; examType: 'monthly' | 'half_yearly' | 'final'; maxScore: number; examDate: string; entries: Map<string, Pending> }>()

  for (const r of rows) {
    const fail = (message: string) => errors.push({ row: r.rowNumber, message })
    const resolved = resolveStudent(lookup, pick(r.cells, GR_COLS), pick(r.cells, ROLL_COLS))
    if (!resolved.ok) { fail(resolved.error); continue }

    const subjectRaw = pick(r.cells, SUBJECT_COLS)
    const subject = subjectByGrade.get(`${resolved.student.gradeLevel}|${subjectRaw.trim().toLowerCase()}`)
    if (!subject) { fail(`"${subjectRaw || '(blank)'}" is not a subject of Grade ${resolved.student.gradeLevel}.`); continue }

    const examRaw = pick(r.cells, EXAM_COLS)
    const examType = EXAM_TYPES[examRaw.toLowerCase().replace(/[^a-z]/g, '')]
    if (!examType) { fail(`Exam must be Monthly, Half-Yearly or Final (got "${examRaw || 'blank'}").`); continue }

    const scoreRaw = pick(r.cells, SCORE_COLS)
    const totalRaw = pick(r.cells, TOTAL_COLS)
    const score = Number(scoreRaw)
    const maxScore = totalRaw === '' ? 100 : Number(totalRaw)
    if (scoreRaw === '' || !Number.isInteger(score) || score < 0) { fail(`Marks must be a whole number (got "${scoreRaw || 'blank'}").`); continue }
    if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) { fail(`Total marks must be a whole number from 1 to 1000 (got "${totalRaw}").`); continue }
    if (score > maxScore) { fail(`Marks ${score} are above the total ${maxScore}.`); continue }

    const dateRaw = pick(r.cells, DATE_COLS)
    const examDate = parseDate(dateRaw)
    if (!examDate) { fail(`Exam date is missing or not a valid date (got "${dateRaw || 'blank'}"). Use DD/MM/YYYY or YYYY-MM-DD.`); continue }
    if (examDate > today) { fail(`Exam date ${examDate} is in the future.`); continue }

    const key = `${subject}|${examType}|${maxScore}|${examDate}`
    const group = groups.get(key) ?? { subject, examType, maxScore, examDate, entries: new Map() }
    if (group.entries.has(resolved.student.id)) { fail(`Duplicate: ${resolved.student.fullName} already appears for ${subject} ${examType} on ${examDate} (row ${group.entries.get(resolved.student.id)!.row}).`); continue }
    group.entries.set(resolved.student.id, { row: r.rowNumber, studentId: resolved.student.id, studentName: resolved.student.fullName, score })
    groups.set(key, group)
  }

  let inserted = 0
  let updated = 0
  for (const g of groups.values()) {
    const entries = Array.from(g.entries.values())
    const outcome = await bulkSaveMarksAction(
      {
        subject: g.subject, examType: g.examType, maxScore: g.maxScore, examDate: g.examDate, classLabel: 'Spreadsheet upload',
        entries: entries.map((e) => ({ studentId: e.studentId, studentName: e.studentName, score: e.score })),
      },
      supabase,
    )
    if (outcome.ok) {
      inserted += outcome.inserted
      updated += outcome.updated
    } else {
      for (const e of entries) errors.push({ row: e.row, message: `Not saved (${g.subject} ${g.examType} ${g.examDate}): ${outcome.error}` })
    }
  }

  errors.sort((a, b) => a.row - b.row)
  return {
    totalRows: rows.length,
    saved: inserted + updated,
    inserted,
    updated,
    skipped: errors.length,
    errors: errors.slice(0, 100),
  }
}
