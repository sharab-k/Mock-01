import { createAdminClient } from '@/lib/supabase/admin'
import type { Tier } from '@/lib/marks/tier'
import {
  buildAttendanceMonths,
  buildFeeLines,
  buildMarksByMonth,
  computeAttendanceSummary,
  computeOverallAverage,
  computeTier,
  monthEnd,
  resolveReportMonth,
  type AttendanceMonthBlock,
  type FeeLine,
  type MarksMonthBlock,
  type ReportMonth,
} from './aggregate'

export type { ReportMark } from './aggregate'

/** 'month' = only the report month's attendance, marks and fee; 'full' = the whole record to date. */
export type ReportScope = 'month' | 'full'

export type ReportData = {
  scope: ReportScope
  student: { fullName: string; rollNumber: string; grNumber: string | null; gradeLevel: string; section: string; program: string }
  /** The month this report is for — shown in its header. */
  reportMonth: ReportMonth
  generatedAt: string
  /** Attendance over the whole record up to the end of the report month. */
  attendancePct: number | null
  presentDays: number
  totalDays: number
  /** Attendance within the report month alone. */
  monthAttendancePct: number | null
  monthPresentDays: number
  monthTotalDays: number
  attendanceMonths: AttendanceMonthBlock[]
  marksByMonth: MarksMonthBlock[]
  /** Average over every mark up to the end of the report month. */
  overallAverage: number | null
  /** Average over marks for exams held in the report month alone. */
  monthAverage: number | null
  tier: Tier | null
  fees: { monthlyFee: number | null; lines: FeeLine[]; paidCount: number }
}

// Called only after the route handler has already verified the caller is
// authorized (a linked parent or a staff role) — this uses the service-role
// client deliberately, the same way lib/admissions/parent-lookup.ts does,
// because a report legitimately needs to read attendance, marks and fees in
// one pass regardless of which specific RLS-scoped role is asking. The
// authorization check is what makes this safe, not what the caller's own RLS
// policies would otherwise allow.
export async function fetchReportData(studentId: string, monthParam?: string | null, scope: ReportScope = 'full'): Promise<ReportData | null> {
  const admin = createAdminClient()
  const reportMonth = resolveReportMonth(monthParam)
  const endDate = monthEnd(reportMonth.key)

  const { data: student } = await admin
    .from('students')
    .select('full_name, roll_number, gr_number, grade_level, section, program, enrollment_date, tuition_fee')
    .eq('id', studentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!student) return null

  const [attendanceRes, marksRes, feesRes] = await Promise.all([
    admin.from('attendance_records').select('status, class_date').eq('student_id', studentId).lte('class_date', endDate),
    admin.from('marks').select('subject, exam_type, score, max_score, exam_date, tests(title)').eq('student_id', studentId).lte('exam_date', endDate),
    admin.from('fee_payments').select('year, month, status').eq('student_id', studentId),
  ])

  const allAttRows = attendanceRes.data ?? []
  const allMarkRows = (marksRes.data ?? []).map((m) => ({
    subject: m.subject, exam_type: m.exam_type, score: m.score, max_score: m.max_score, test_title: m.tests?.title ?? null, exam_date: m.exam_date,
  }))
  const monthMarks = allMarkRows.filter((m) => m.exam_date.startsWith(reportMonth.key))
  const monthAtt = allAttRows.filter((r) => r.class_date.startsWith(reportMonth.key))
  // The current-month report carries only that month's attendance and marks;
  // the full report carries everything up to the end of the month.
  const attRows = scope === 'month' ? monthAtt : allAttRows
  const markRows = scope === 'month' ? monthMarks : allMarkRows
  const overallAverage = computeOverallAverage(markRows)

  const paidKeys = new Set((feesRes.data ?? []).filter((f) => f.status === 'paid').map((f) => `${f.year}-${String(f.month).padStart(2, '0')}`))
  const lines = buildFeeLines(student.enrollment_date, reportMonth.key, paidKeys)

  const overall = computeAttendanceSummary(allAttRows)
  const month = computeAttendanceSummary(monthAtt)

  return {
    student: {
      fullName: student.full_name.trim(),
      rollNumber: student.roll_number,
      grNumber: student.gr_number?.trim() || null,
      gradeLevel: student.grade_level,
      section: student.section,
      program: student.program,
    },
    scope,
    reportMonth,
    generatedAt: new Date().toISOString(),
    ...overall,
    monthAttendancePct: month.attendancePct,
    monthPresentDays: month.presentDays,
    monthTotalDays: month.totalDays,
    attendanceMonths: buildAttendanceMonths(attRows, reportMonth.key),
    marksByMonth: buildMarksByMonth(markRows, reportMonth.key),
    overallAverage,
    monthAverage: computeOverallAverage(monthMarks),
    tier: computeTier(scope === 'month' ? computeOverallAverage(monthMarks) : overallAverage),
    fees: { monthlyFee: student.tuition_fee, lines, paidCount: lines.filter((l) => l.status === 'paid').length },
  }
}
