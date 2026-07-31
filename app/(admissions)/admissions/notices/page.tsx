import AdmissionsNoticesContent from '@/components/dashboard/modules/AdmissionsNoticesContent'
import { fetchVisibleNotices } from '@/lib/notices/fetch'

export default async function AdmissionsNoticesPage() {
  const notices = await fetchVisibleNotices()
  return <AdmissionsNoticesContent notices={notices} />
}
