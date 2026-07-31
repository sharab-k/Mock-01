import { requireParentAccessToChild } from '@/lib/auth/require-parent-access'
import StudentAssignmentsContent from '@/components/dashboard/modules/StudentAssignmentsContent'

export default async function StudentAssignmentsPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  await requireParentAccessToChild(studentId)

  return <StudentAssignmentsContent studentId={studentId} />
}
