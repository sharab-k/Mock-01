import MarksDashboardContent from '@/components/dashboard/modules/MarksDashboardContent'
import { fetchMarksDashboardData } from '@/lib/marks/dashboard-data'

export default async function SuperAdminMarksPage() {
  const data = await fetchMarksDashboardData()
  return <MarksDashboardContent basePath="/super-admin/marks" {...data} />
}
