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
