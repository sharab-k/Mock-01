import AttendanceReportsContent from '@/components/dashboard/modules/AttendanceReportsContent'
import { fetchAttendanceReportsData } from '@/lib/attendance/reports-data'

export default async function AttendanceReportsPage() {
  const data = await fetchAttendanceReportsData()
  return <AttendanceReportsContent {...data} />
}
