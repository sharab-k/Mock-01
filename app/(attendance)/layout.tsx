import DashboardShell from '@/components/dashboard/DashboardShell'
import type { UserInfo } from '@/components/dashboard/types'

const MOCK_USER: UserInfo = {
  name:      'Attendance Admin',
  email:     'attendance@jeacademy.edu.pk',
  role:      'attendance_admin',
  roleLabel: 'Attendance',
  roleColor: '#487A63',
  initials:  'AT',
}

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell user={MOCK_USER}>{children}</DashboardShell>
}
