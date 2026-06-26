import DashboardShell from '@/components/dashboard/DashboardShell'
import type { UserInfo } from '@/components/dashboard/types'

const MOCK_USER: UserInfo = {
  name:      'Rashid Hassan',
  email:     'rashid.hassan@jeacademy.edu.pk',
  role:      'parent',
  roleLabel: 'Parent',
  roleColor: '#988671',
  initials:  'RH',
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell user={MOCK_USER}>{children}</DashboardShell>
}
