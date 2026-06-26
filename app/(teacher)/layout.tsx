import DashboardShell from '@/components/dashboard/DashboardShell'
import type { UserInfo } from '@/components/dashboard/types'

const MOCK_USER: UserInfo = {
  name:      'Ms. Ayesha Malik',
  email:     'a.malik@jeacademy.edu.pk',
  role:      'teacher',
  roleLabel: 'Teacher',
  roleColor: '#4A7B9D',
  initials:  'AM',
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell user={MOCK_USER}>{children}</DashboardShell>
}
