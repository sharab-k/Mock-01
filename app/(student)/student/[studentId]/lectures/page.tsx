import StudentLecturesContent from '@/components/dashboard/modules/StudentLecturesContent'
import { requireParentAccessToChild } from '@/lib/auth/require-parent-access'
import { fetchStudentLectures } from '@/lib/student/lectures'

export default async function StudentLecturesPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const { student } = await requireParentAccessToChild(studentId)
  const lectures = await fetchStudentLectures(studentId)

  return <StudentLecturesContent studentId={studentId} isLateEnrollment={student.is_late_enrollment} initialLectures={lectures} />
}
