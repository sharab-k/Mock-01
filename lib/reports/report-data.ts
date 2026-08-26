import { createAdminClient } from '@/lib/supabase/admin'
import { currentTerm } from '@/lib/marks/term'
import type { Tier } from '@/lib/marks/tier'
import { groupMarksByExam, computeOverallAverage, computeTier, computeAttendanceSummary, buildAttendanceLog, type MarksByExamGroup, type AttendanceLogMonth } from './aggregate'

export type { ReportMark } from './aggregate'

export type ReportData = {
  student: { fullName: string; rollNumber: string; gradeLevel: string; section: string; program: string }
  term: string
  generatedAt: string
  attendancePct: number | null
  presentDays: number
  totalDays: number
  attendanceLog: AttendanceLogMonth[]
  marksByExam: MarksByExamGroup[]
  overallAverage: number | null
  tier: Tier | null
}

// Called only after the route handler has already verified the caller is
// authorized (a linked parent or a staff role) — this uses the service-role
// client deliberately, the same way lib/admissions/parent-lookup.ts does,
// because a report legitimately needs to read both attendance_records and
// marks in one pass regardless of which specific RLS-scoped role is asking
// (attendance_admin has no marks RLS access and vice versa; only super_admin
// natively has both). The authorization check is what makes this safe, not
// what the caller's own RLS policies would otherwise allow.
export async function fetchReportData(studentId: string): Promise<ReportData | null> {
  const admin = createAdminClient()
  const term = currentTerm()

  const { data: student } = await admin
    .from('students')
    .select('full_name, roll_number, grade_level, section, program')
    .eq('id', studentId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!student) return null

  const [attendanceRes, marksRes] = await Promise.all([
    admin.from('attendance_records').select('status, class_date').eq('student_id', studentId),
    admin.from('marks').select('subject, exam_type, score, max_score').eq('student_id', studentId).eq('term', term),
  ])

  const attRows = attendanceRes.data ?? []
  const markRows = marksRes.data ?? []
  const overallAverage = computeOverallAverage(markRows)

  return {
    student: {
      fullName: student.full_name,
      rollNumber: student.roll_number,
      gradeLevel: student.grade_level,
      section: student.section,
      program: student.program,
    },
    term,
    generatedAt: new Date().toISOString(),
    ...computeAttendanceSummary(attRows),
    attendanceLog: buildAttendanceLog(attRows),
    marksByExam: groupMarksByExam(markRows),
    overallAverage,
    tier: computeTier(overallAverage),
  }
}
