import ParentDashboardContent from '@/components/dashboard/modules/ParentDashboardContent'
import { fetchParentChildren } from '@/lib/parent/dashboard-data'
import { fetchVisibleNotices } from '@/lib/notices/fetch'

export default async function ParentDashboard() {
  const [kids, allNotices] = await Promise.all([
    fetchParentChildren(),
    fetchVisibleNotices(),
  ])

  // RLS already scopes a parent session to All/Parents/Students audience
  // notices combined — the parent's own dashboard panel wants the
  // parent-relevant subset, not their child's 'Students'-audience notices
  // (those show on the student-view notices page instead).
  const notices = allNotices.filter((n) => n.audience === 'All' || n.audience === 'Parents')

  return <ParentDashboardContent kids={kids} notices={notices} />
}
