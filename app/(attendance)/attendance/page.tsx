import { redirect } from 'next/navigation'

// Attendance management has been consolidated into the Attendance Dashboard at /teacher
export default function AttendancePage() {
  redirect('/teacher')
}
