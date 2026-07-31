import AttendanceDashboardContent from '@/components/dashboard/modules/AttendanceDashboardContent'
import { fetchAttendanceDashboardData } from '@/lib/attendance/dashboard-data'

export default async function SuperAdminAttendancePage() {
  const data = await fetchAttendanceDashboardData()
  return <AttendanceDashboardContent basePath="/super-admin/attendance" {...data} />
}
