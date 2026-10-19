// Pure aggregation math, no Supabase/Next dependency — kept separate from
// report-data.ts (which imports the service-role client, guarded by
// `server-only`) so the actual grouping/averaging logic can be unit tested
// directly instead of only through a live database round trip.
import { tierOf, type Tier } from '@/lib/marks/tier'
import { letterGrade } from '@/lib/marks/letter-grade'

export const EXAM_TYPE_LABEL: Record<string, string> = { monthly: 'Monthly', half_yearly: 'Half-Yearly', final: 'Final', custom: 'Class Tests' }
export const EXAM_TYPE_ORDER = ['monthly', 'half_yearly', 'final', 'custom'] as const

// test_title is set only for exam_type 'custom' (a Marks-Admin-created test) —
// it's what tells one class test from another on the report.
export type RawMarkRow = { subject: string; exam_type: string; score: number; max_score: number; test_title?: string | null; exam_date?: string | null }
export type RawAttendanceRow = { status: string }
export type RawAttendanceLogRow = { status: string; class_date: string }
export type AttendanceLogRow = { date: string; status: 'present' | 'late' | 'absent' }
export type AttendanceLogMonth = { label: string; rows: AttendanceLogRow[] }

export type ReportMark = { subject: string; score: number; maxScore: number; grade: string; date?: string | null }
export type MarksByExamGroup = { examType: string; label: string; rows: ReportMark[] }

export function groupMarksByExam(markRows: RawMarkRow[]): MarksByExamGroup[] {
  return EXAM_TYPE_ORDER
    .map((examType) => ({
      examType,
      label: EXAM_TYPE_LABEL[examType],
      rows: markRows
        .filter((m) => m.exam_type === examType)
        .map((m) => ({
          subject: m.exam_type === 'custom' && m.test_title ? `${m.subject} — ${m.test_title}` : m.subject,
          score: m.score,
          maxScore: m.max_score,
          grade: letterGrade(m.score, m.max_score),
          date: m.exam_date ?? null,
        })),
    }))
    .filter((group) => group.rows.length > 0)
}

export function computeOverallAverage(markRows: RawMarkRow[]): number | null {
  if (markRows.length === 0) return null
  return Math.round(markRows.reduce((a, m) => a + (m.score / m.max_score) * 100, 0) / markRows.length)
}

export function computeTier(overallAverage: number | null): Tier | null {
  return overallAverage !== null ? tierOf(overallAverage) : null
}

export function computeAttendanceSummary(attRows: RawAttendanceRow[]): { attendancePct: number | null; presentDays: number; totalDays: number } {
  const presentDays = attRows.filter((r) => r.status === 'present' || r.status === 'late').length
  const totalDays = attRows.length
  return {
    presentDays,
    totalDays,
    attendancePct: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : null,
  }
}

// Every attendance_records row for the student, grouped by calendar month —
// the report previously only showed the aggregate percentage, not the
// underlying day-by-day record it's computed from.
export function buildAttendanceLog(attRows: RawAttendanceLogRow[]): AttendanceLogMonth[] {
  const byMonth = new Map<string, AttendanceLogRow[]>()
  for (const row of attRows) {
    const d = new Date(`${row.class_date}T00:00:00Z`)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth()).padStart(2, '0')}`
    if (!byMonth.has(key)) byMonth.set(key, [])
    byMonth.get(key)!.push({ date: row.class_date, status: row.status as AttendanceLogRow['status'] })
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, rows]) => {
      const [year, month] = key.split('-').map(Number)
      const label = new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      return { label, rows: rows.sort((a, b) => b.date.localeCompare(a.date)) }
    })
}

// ---- Monthly progress report ---------------------------------------------------
// The report is "for" one month (shown in its header) and carries the student's
// whole record up to the end of that month: every attendance day, every mark
// (with its exam date) and every month's fee status — the report month's own
// figures are called out alongside the running totals.

export type ReportMonth = { key: string; label: string }

export function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export const monthKeyOf = (isoDate: string): string => isoDate.slice(0, 7)

// Last calendar day of 'YYYY-MM' as YYYY-MM-DD.
export function monthEnd(key: string): string {
  const [y, m] = key.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
}

// 'YYYY-MM' from the request, defaulting to (and never later than) the current month.
export function resolveReportMonth(raw: string | null | undefined, now: Date = new Date()): ReportMonth {
  const current = now.toISOString().slice(0, 7)
  const key = raw && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw) && raw <= current ? raw : current
  return { key, label: monthLabel(key) }
}

export type AttendanceMonthBlock = {
  key: string
  label: string
  isReportMonth: boolean
  present: number
  late: number
  absent: number
  total: number
  rows: AttendanceLogRow[]
}

// Every attendance day up to the end of the report month, newest month first,
// days within a month in date order, with the month's own counts.
export function buildAttendanceMonths(attRows: RawAttendanceLogRow[], reportKey: string): AttendanceMonthBlock[] {
  const byMonth = new Map<string, AttendanceLogRow[]>()
  for (const row of attRows) {
    const key = monthKeyOf(row.class_date)
    if (key > reportKey) continue
    byMonth.set(key, [...(byMonth.get(key) ?? []), { date: row.class_date, status: row.status as AttendanceLogRow['status'] }])
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, rows]) => {
      const sorted = rows.sort((a, b) => a.date.localeCompare(b.date))
      return {
        key,
        label: monthLabel(key),
        isReportMonth: key === reportKey,
        present: sorted.filter((r) => r.status === 'present').length,
        late: sorted.filter((r) => r.status === 'late').length,
        absent: sorted.filter((r) => r.status === 'absent').length,
        total: sorted.length,
        rows: sorted,
      }
    })
}

export type MarkLine = { date: string; subject: string; exam: string; score: number; maxScore: number; grade: string }
export type MarksMonthBlock = { key: string; label: string; isReportMonth: boolean; average: number | null; rows: MarkLine[] }
export type RawDatedMark = RawMarkRow & { exam_date: string }

const examName = (m: RawMarkRow): string =>
  m.exam_type === 'custom' ? (m.test_title ?? 'Class test') : (EXAM_TYPE_LABEL[m.exam_type] ?? m.exam_type)

// Every mark with an exam date up to the end of the report month, grouped by the
// month the exam was held in (newest month first, exams in date order).
export function buildMarksByMonth(rows: RawDatedMark[], reportKey: string): MarksMonthBlock[] {
  const byMonth = new Map<string, RawDatedMark[]>()
  for (const m of rows) {
    const key = monthKeyOf(m.exam_date)
    if (key > reportKey) continue
    byMonth.set(key, [...(byMonth.get(key) ?? []), m])
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, list]) => ({
      key,
      label: monthLabel(key),
      isReportMonth: key === reportKey,
      average: computeOverallAverage(list),
      rows: list
        .sort((a, b) => a.exam_date.localeCompare(b.exam_date) || a.subject.localeCompare(b.subject))
        .map((m) => ({ date: m.exam_date, subject: m.subject, exam: examName(m), score: m.score, maxScore: m.max_score, grade: letterGrade(m.score, m.max_score) })),
    }))
}

export type FeeLine = { key: string; label: string; status: 'paid' | 'unpaid'; isReportMonth: boolean }

// One line per month from the month the student enrolled up to the report
// month (newest first — every month, not a recent window). A month with no fee record counts as
// unpaid — the same convention the fee roster uses.
export function buildFeeLines(enrollmentDate: string, reportKey: string, paidKeys: ReadonlySet<string>): FeeLine[] {
  const start = monthKeyOf(enrollmentDate)
  const out: FeeLine[] = []
  let [y, m] = reportKey.split('-').map(Number)
  while (out.length < 120) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    if (key < start) break
    out.push({ key, label: monthLabel(key), status: paidKeys.has(key) ? 'paid' : 'unpaid', isReportMonth: key === reportKey })
    m -= 1
    if (m === 0) { m = 12; y -= 1 }
  }
  return out
}
