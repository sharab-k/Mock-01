import DashboardShell from '@/components/dashboard/DashboardShell'
import type { UserInfo } from '@/components/dashboard/types'

const MOCK_USER: UserInfo = {
  name:      'Ahmed Ali',
  email:     'ahmed.ali@students.jeacademy.edu.pk',
  role:      'student',
  roleLabel: 'Student',
  roleColor: '#547B96',
  initials:  'AA',
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell user={MOCK_USER}>{children}</DashboardShell>
}
