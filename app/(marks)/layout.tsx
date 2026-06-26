import DashboardShell from '@/components/dashboard/DashboardShell'
import type { UserInfo } from '@/components/dashboard/types'

const MOCK_USER: UserInfo = {
  name:      'Marks Admin',
  email:     'marks@jeacademy.edu.pk',
  role:      'marks_admin',
  roleLabel: 'Marks',
  roleColor: '#7E587E',
  initials:  'MA',
}

export default function MarksLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell user={MOCK_USER}>{children}</DashboardShell>
}
