import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'
import { saveMarksBatch, type BulkMarkRow } from '@/lib/marks/bulk-save'
import { loadStudentLookup, resolveStudent } from '@/lib/uploads/students'
import { gridToRows, parseDate, pick, readWorkbook, todayIso, type Grid } from '@/lib/uploads/sheet'
import { parseCell, parseWideSheets, type WideBlock } from '@/lib/marks/wide-sheet'
import { dateInMonth, monthOptionLabel } from '@/lib/reports/months'
import { buildMatcher, gradesForSheet, type MatchStudent } from '@/lib/marks/student-match'
import { EXAM_LABEL, type ExamType, type MarksUploadResult, type UploadRowError } from '@/lib/marks/upload-types'
import { chooseAlternative, isKnownAbbreviation, subjectNameFor, totalFor, type SubjectEntry } from '@/lib/marks/wide-subjects'

export type { UploadRowError, ExamType, MarksUploadResult }
export { EXAM_LABEL }

/** examMonth ('YYYY-MM', optional): the month this exam was held in. Marks dated in another month are refused; rows with no date use it. */
export type UploadOptions = { examType: ExamType; dryRun: boolean; notify: boolean; examMonth?: string | null }

type Pending = { row: number; studentId: string; studentName: string; score: number }
type GroupMap = Map<string, { subject: string; maxScore: number; examDate: string; entries: Map<string, Pending> }>

const GR_COLS = ['grno', 'grnumber', 'gr', 'grn', 'registrationno']
const ROLL_COLS = ['rollno', 'rollnumber', 'roll']
const SUBJECT_COLS = ['subject']
const EXAM_COLS = ['exam', 'examtype', 'type', 'test']
const SCORE_COLS = ['marks', 'score', 'obtained', 'obtainedmarks', 'marksobtained']
const TOTAL_COLS = ['total', 'totalmarks', 'max', 'maxmarks', 'outof', 'maximum']
const DATE_COLS = ['examdate', 'date', 'dateofexam']

const EXAM_TYPES: Record<string, ExamType> = {
  monthly: 'monthly', month: 'monthly', m: 'monthly',
  halfyearly: 'half_yearly', half: 'half_yearly', h: 'half_yearly', halfyear: 'half_yearly',
  final: 'final', f: 'final', annual: 'final',
}

const MAX_LIST = 500

// Reads the file, works out which of the two layouts it is, validates every
// mark, and either reports what it found (dryRun) or saves it through
// saveMarksBatch (one database call per 500 marks) — edit history, grade
// notices (when asked for) and the audit log all behave identically.
export async function processMarksUpload(
  supabase: SupabaseClient<Database>,
  userId: string,
  file: File,
  opts: UploadOptions,
): Promise<{ ok: true; result: MarksUploadResult } | { ok: false; error: string }> {
  const book = await readWorkbook(file)
  if (!book.ok) return book

  const wide = parseWideSheets(book.sheets, parseDate)
  const planned = wide.length > 0
    ? await planWide(supabase, wide, opts)
    : await planRows(supabase, book.sheets[0], opts)
  if (!planned.ok) return planned
  return { ok: true, result: await finish(supabase, userId, planned.plan, opts) }
}

type Plan = {
  format: 'rows' | 'wide'
  groups: GroupMap
  errors: UploadRowError[]
  warnings: UploadRowError[]
  tests: string[]
  totalRows: number
  noMark: number
}

async function loadSubjects(supabase: SupabaseClient<Database>): Promise<SubjectEntry[]> {
  const { data } = await supabase.from('subjects').select('name, grade_level')
  return (data ?? []).map((s) => ({ name: s.name, grade: s.grade_level }))
}

async function loadMatchStudents(supabase: SupabaseClient<Database>): Promise<MatchStudent[]> {
  const out: MatchStudent[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, gr_number, grade_level, stream')
      .is('deleted_at', null)
      .order('id')
      .range(from, from + 999)
    if (error) throw error
    for (const s of data ?? []) out.push({ id: s.id, fullName: s.full_name.trim(), gr: s.gr_number, grade: s.grade_level, stream: s.stream })
    if (!data || data.length < 1000) break
  }
  return out
}

function addEntry(
  groups: GroupMap,
  seen: Map<string, { score: number; max: number; row: number }>,
  errors: UploadRowError[],
  where: string,
  e: { row: number; studentId: string; studentName: string; score: number; subject: string; maxScore: number; examDate: string },
) {
  const key = `${e.subject}|${e.maxScore}|${e.examDate}`
  const once = `${e.studentId}|${e.subject}|${e.examDate}`
  const prior = seen.get(once)
  if (prior) {
    // The same mark appearing twice is harmless; two different marks for one exam is not.
    if (prior.score !== e.score || prior.max !== e.maxScore) {
      errors.push({ row: e.row, message: `${where}Duplicate: ${e.studentName} already has ${e.subject} on ${e.examDate} (row ${prior.row}) with a different mark.` })
    }
    return
  }
  seen.set(once, { score: e.score, max: e.maxScore, row: e.row })
  const group = groups.get(key) ?? { subject: e.subject, maxScore: e.maxScore, examDate: e.examDate, entries: new Map() }
  group.entries.set(e.studentId, { row: e.row, studentId: e.studentId, studentName: e.studentName, score: e.score })
  groups.set(key, group)
}

// ---- wide "one column per test" result sheets --------------------------------

async function planWide(supabase: SupabaseClient<Database>, blocks: WideBlock[], opts: UploadOptions): Promise<{ ok: true; plan: Plan } | { ok: false; error: string }> {
  const [students, subjects] = await Promise.all([loadMatchStudents(supabase), loadSubjects(supabase)])
  const match = buildMatcher(students)
  const today = todayIso()

  const groups: GroupMap = new Map()
  const seen = new Map<string, { score: number; max: number; row: number }>()
  const errors: UploadRowError[] = []
  const warnings: UploadRowError[] = []
  const tests: string[] = []
  let totalRows = 0
  let noMark = 0
  const unknownAbbrs = new Set<string>()
  const warnedStudent = new Set<string>()

  for (const block of blocks) {
    const where = `[${block.sheet}] `
    const usable = block.columns.filter((c) => {
      if (c.date > today) { errors.push({ row: block.headerRow, message: `${where}Column dated ${c.date} is in the future — skipped.` }); return false }
      if (opts.examMonth && !c.date.startsWith(opts.examMonth)) { errors.push({ row: block.headerRow, message: `${where}Column dated ${c.date} is not in ${monthOptionLabel(opts.examMonth)} — skipped.` }); return false }
      if (c.alts.length === 0) { errors.push({ row: block.headerRow, message: `${where}Column dated ${c.date} has no subject — skipped.` }); return false }
      const bad = c.alts.find((a) => !isKnownAbbreviation(a))
      if (bad) { unknownAbbrs.add(bad); errors.push({ row: block.headerRow, message: `${where}Column ${c.date} · "${c.header}": subject "${bad}" is not recognised — column skipped.` }); return false }
      return true
    })
    for (const c of usable) tests.push(`${block.sheet} · ${c.date} · ${c.alts.join('/')} · ${c.totals.raw || 'no total'}`)

    for (const s of block.students) {
      totalRows++
      const m = match(s.gr, s.name, gradesForSheet(block.sheet))
      if (!m.ok) { errors.push({ row: s.row, message: `${where}${m.error}` }); continue }
      const st = m.student
      if (m.via === 'gr' && s.name && m.hits === 0) {
        errors.push({ row: s.row, message: `${where}G.R. "${s.gr}" is ${st.fullName} in the system but "${s.name}" in the sheet — no name in common, not saved. Check which is right.` })
        continue
      }
      if (!warnedStudent.has(`${st.id}|${s.row}`)) {
        warnedStudent.add(`${st.id}|${s.row}`)
        if (m.via === 'name') warnings.push({ row: s.row, message: `${where}"${s.name}" matched to ${st.fullName} (GR ${st.gr ?? '—'}) by NAME — the sheet's G.R. "${s.gr || 'blank'}" did not match.` })
        else if (m.via === 'gr-number') warnings.push({ row: s.row, message: `${where}G.R. "${s.gr}" matched to ${st.fullName} (GR ${st.gr}) by number.` })
        else if (m.ratio !== null && m.ratio < 0.5) warnings.push({ row: s.row, message: `${where}G.R. "${s.gr}" is ${st.fullName} in the system but "${s.name}" in the sheet — check it is the same student.` })
      }

      usable.forEach((col) => {
        const raw = s.values[block.columns.indexOf(col)]
        const cell = parseCell(raw)
        if (cell.kind === 'blank') return
        if (cell.kind === 'no-mark') { noMark++; return }
        if (cell.kind === 'error') { errors.push({ row: s.row, message: `${where}${st.fullName} · ${col.date} ${col.header}: ${cell.message}` }); return }

        const chosen = chooseAlternative(col.alts, st)
        if (!chosen) { errors.push({ row: s.row, message: `${where}${st.fullName} · ${col.date} ${col.alts.join('/')}: cannot tell which subject this student takes (stream: ${st.stream ?? 'not set'}).` }); return }
        const subject = subjectNameFor(chosen, st.grade, subjects)
        if (!subject) { errors.push({ row: s.row, message: `${where}${st.fullName} · ${chosen} is not a subject of Grade ${st.grade}.` }); return }
        const total = cell.total ?? totalFor(col.totals, col.alts, chosen, st)
        if (!total || total < 1 || total > 1000) { errors.push({ row: s.row, message: `${where}${st.fullName} · ${subject} ${col.date}: total marks for ${chosen} are missing in the header.` }); return }
        if (cell.score > total) { errors.push({ row: s.row, message: `${where}${st.fullName} · ${subject} ${col.date}: ${cell.score} is above the total ${total}.` }); return }

        addEntry(groups, seen, errors, where, { row: s.row, studentId: st.id, studentName: st.fullName, score: cell.score, subject, maxScore: total, examDate: col.date })
      })
    }
  }
  if (unknownAbbrs.size > 0) tests.push(`Unrecognised subject codes (columns skipped): ${Array.from(unknownAbbrs).join(', ')}`)
  return { ok: true, plan: { format: 'wide', groups, errors, warnings, tests, totalRows, noMark } }
}

// ---- one row per mark ---------------------------------------------------------

async function planRows(supabase: SupabaseClient<Database>, sheet: Grid, opts: UploadOptions): Promise<{ ok: true; plan: Plan } | { ok: false; error: string }> {
  const rows = gridToRows(sheet)
  if (rows.length === 0) return { ok: false, error: 'The file has no data rows.' }
  const today = todayIso()

  const [subjectRows, lookup] = await Promise.all([
    supabase.from('subjects').select('name, grade_level'),
    loadStudentLookup(supabase, rows.map((r) => pick(r.cells, GR_COLS)), rows.map((r) => pick(r.cells, ROLL_COLS))),
  ])
  const subjectByGrade = new Map<string, string>()
  for (const s of subjectRows.data ?? []) subjectByGrade.set(`${s.grade_level}|${s.name.trim().toLowerCase()}`, s.name)

  const groups: GroupMap = new Map()
  const seen = new Map<string, { score: number; max: number; row: number }>()
  const errors: UploadRowError[] = []

  for (const r of rows) {
    const fail = (message: string) => errors.push({ row: r.rowNumber, message })
    const resolved = resolveStudent(lookup, pick(r.cells, GR_COLS), pick(r.cells, ROLL_COLS))
    if (!resolved.ok) { fail(resolved.error); continue }

    const subjectRaw = pick(r.cells, SUBJECT_COLS)
    const subject = subjectByGrade.get(`${resolved.student.gradeLevel}|${subjectRaw.trim().toLowerCase()}`)
    if (!subject) { fail(`"${subjectRaw || '(blank)'}" is not a subject of Grade ${resolved.student.gradeLevel}.`); continue }

    const examRaw = pick(r.cells, EXAM_COLS)
    if (examRaw) {
      const t = EXAM_TYPES[examRaw.toLowerCase().replace(/[^a-z]/g, '')]
      if (!t) { fail(`Exam must be Monthly, Half-Yearly or Final (got "${examRaw}").`); continue }
      if (t !== opts.examType) { fail(`Row is ${EXAM_LABEL[t]} but this upload is ${EXAM_LABEL[opts.examType]}.`); continue }
    }

    const scoreRaw = pick(r.cells, SCORE_COLS)
    const totalRaw = pick(r.cells, TOTAL_COLS)
    const score = Number(scoreRaw)
    const maxScore = totalRaw === '' ? 100 : Number(totalRaw)
    if (scoreRaw === '' || !Number.isInteger(score) || score < 0) { fail(`Marks must be a whole number (got "${scoreRaw || 'blank'}").`); continue }
    if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) { fail(`Total marks must be a whole number from 1 to 1000 (got "${totalRaw}").`); continue }
    if (score > maxScore) { fail(`Marks ${score} are above the total ${maxScore}.`); continue }

    const dateRaw = pick(r.cells, DATE_COLS)
    const examDate = parseDate(dateRaw) ?? (!dateRaw && opts.examMonth ? dateInMonth(opts.examMonth, `${opts.examMonth}-01`, today) : null)
    if (!examDate) { fail(`Exam date is missing or not a valid date (got "${dateRaw || 'blank'}"). Use DD/MM/YYYY or YYYY-MM-DD.`); continue }
    if (examDate > today) { fail(`Exam date ${examDate} is in the future.`); continue }
    if (opts.examMonth && !examDate.startsWith(opts.examMonth)) { fail(`Exam date ${examDate} is not in ${monthOptionLabel(opts.examMonth)}.`); continue }

    addEntry(groups, seen, errors, '', { row: r.rowNumber, studentId: resolved.student.id, studentName: resolved.student.fullName, score, subject, maxScore, examDate })
  }
  return { ok: true, plan: { format: 'rows', groups, errors, warnings: [], tests: [], totalRows: rows.length, noMark: 0 } }
}

// ---- save (or just report) ------------------------------------------------------

async function finish(supabase: SupabaseClient<Database>, userId: string, plan: Plan, opts: UploadOptions): Promise<MarksUploadResult> {
  const errors = [...plan.errors]
  let inserted = 0
  let updated = 0
  let toSave = 0
  const studentIds = new Set<string>()
  for (const g of plan.groups.values()) {
    toSave += g.entries.size
    for (const id of g.entries.keys()) studentIds.add(id)
  }

  if (!opts.dryRun) {
    // One database call per 500 marks for the whole file (see lib/marks/bulk-save.ts).
    const rows: BulkMarkRow[] = []
    for (const g of plan.groups.values()) {
      for (const e of g.entries.values()) rows.push({ studentId: e.studentId, studentName: e.studentName, subject: g.subject, examDate: g.examDate, score: e.score, maxScore: g.maxScore })
    }
    const outcome = await saveMarksBatch(supabase, userId, opts.examType, rows, { notify: opts.notify, label: 'Spreadsheet upload' })
    inserted = outcome.inserted
    updated = outcome.updated
    if (!outcome.ok) errors.push({ row: 0, message: outcome.error })
  }

  errors.sort((a, b) => a.row - b.row)
  plan.warnings.sort((a, b) => a.row - b.row)
  return {
    mode: opts.dryRun ? 'preview' : 'saved',
    format: plan.format,
    examType: opts.examType,
    totalRows: plan.totalRows,
    toSave,
    students: studentIds.size,
    saved: inserted + updated,
    inserted,
    updated,
    skipped: errors.length,
    noMark: plan.noMark,
    errors: errors.slice(0, MAX_LIST),
    warnings: plan.warnings.slice(0, MAX_LIST),
    tests: plan.tests.slice(0, 200),
  }
}
