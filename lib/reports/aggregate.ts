// Pure aggregation math, no Supabase/Next dependency — kept separate from
// report-data.ts (which imports the service-role client, guarded by
// `server-only`) so the actual grouping/averaging logic can be unit tested
// directly instead of only through a live database round trip.
import { tierOf, type Tier } from '@/lib/marks/tier'
import { letterGrade } from '@/lib/marks/letter-grade'

export const EXAM_TYPE_LABEL: Record<string, string> = { monthly: 'Monthly', half_yearly: 'Half-Yearly', final: 'Final' }
export const EXAM_TYPE_ORDER = ['monthly', 'half_yearly', 'final'] as const

export type RawMarkRow = { subject: string; exam_type: string; score: number; max_score: number }
export type RawAttendanceRow = { status: string }
export type RawAttendanceLogRow = { status: string; class_date: string }
export type AttendanceLogRow = { date: string; status: 'present' | 'late' | 'absent' }
export type AttendanceLogMonth = { label: string; rows: AttendanceLogRow[] }

export type ReportMark = { subject: string; score: number; maxScore: number; grade: string }
export type MarksByExamGroup = { examType: string; label: string; rows: ReportMark[] }

export function groupMarksByExam(markRows: RawMarkRow[]): MarksByExamGroup[] {
  return EXAM_TYPE_ORDER
    .map((examType) => ({
      examType,
      label: EXAM_TYPE_LABEL[examType],
      rows: markRows
        .filter((m) => m.exam_type === examType)
        .map((m) => ({ subject: m.subject, score: m.score, maxScore: m.max_score, grade: letterGrade(m.score, m.max_score) })),
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
