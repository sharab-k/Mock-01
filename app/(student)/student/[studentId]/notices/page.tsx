import { requireParentAccessToChild } from '@/lib/auth/require-parent-access'
import StudentNoticesContent from '@/components/dashboard/modules/StudentNoticesContent'
import { fetchVisibleNotices } from '@/lib/notices/fetch'

export default async function StudentNoticesPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  await requireParentAccessToChild(studentId)

  // RLS already scopes a parent session to All/Parents/Students audience
  // notices combined — this view specifically wants the student-relevant
  // subset, not the parent's own 'Parents'-audience notices.
  const visible = await fetchVisibleNotices()
  const notices = visible.filter((n) => n.audience === 'All' || n.audience === 'Students')

  return <StudentNoticesContent studentId={studentId} notices={notices} />
}
