import StudentDashboardContent from '@/components/dashboard/modules/StudentDashboardContent'
import { requireParentAccessToChild } from '@/lib/auth/require-parent-access'
import { fetchStudentDashboardData } from '@/lib/student/dashboard-data'

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const { student } = await requireParentAccessToChild(studentId)
  const data = await fetchStudentDashboardData(studentId)

  return <StudentDashboardContent studentId={studentId} student={student} data={data} />
}
