import AttendanceDashboardContent from '@/components/dashboard/modules/AttendanceDashboardContent'
import { fetchAttendanceDashboardData } from '@/lib/attendance/dashboard-data'

export default async function AttendanceDashboard() {
  const data = await fetchAttendanceDashboardData()
  return <AttendanceDashboardContent basePath="/attendance" {...data} />
}
