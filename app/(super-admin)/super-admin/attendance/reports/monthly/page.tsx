import MonthlyAttendanceReport from '@/components/dashboard/attendance/MonthlyAttendanceReport'

type Props = { searchParams: Promise<{ grade?: string; section?: string; month?: string }> }

export default async function MonthlyAttendancePage({ searchParams }: Props) {
  return <MonthlyAttendanceReport backHref="/super-admin/attendance" searchParams={await searchParams} />
}
