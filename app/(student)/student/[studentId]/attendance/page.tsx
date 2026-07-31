import StudentAttendanceContent from '@/components/dashboard/modules/StudentAttendanceContent'
import { requireParentAccessToChild } from '@/lib/auth/require-parent-access'
import { fetchAttendanceHistory } from '@/lib/student/attendance-history'

export default async function StudentAttendancePage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  await requireParentAccessToChild(studentId)
  const months = await fetchAttendanceHistory(studentId)

  return <StudentAttendanceContent studentId={studentId} months={months} />
}
