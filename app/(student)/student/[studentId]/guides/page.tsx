import { requireParentAccessToChild } from '@/lib/auth/require-parent-access'
import StudentGuidesContent from '@/components/dashboard/modules/StudentGuidesContent'

export default async function StudentGuidesPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  await requireParentAccessToChild(studentId)

  return <StudentGuidesContent studentId={studentId} />
}
