import SuperAdminNoticesContent from '@/components/dashboard/modules/SuperAdminNoticesContent'
import { fetchAllNoticesForAdmin } from '@/lib/notices/fetch'

export default async function SuperAdminNoticesPage() {
  const notices = await fetchAllNoticesForAdmin()
  return <SuperAdminNoticesContent initialNotices={notices} />
}
