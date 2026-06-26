import DashboardShell from '@/components/dashboard/DashboardShell'
import type { UserInfo } from '@/components/dashboard/types'

const MOCK_USER: UserInfo = {
  name:      'Super Admin',
  email:     'admin@jeacademy.edu.pk',
  role:      'super_admin',
  roleLabel: 'Super Admin',
  roleColor: '#233357',
  initials:  'SA',
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell user={MOCK_USER}>{children}</DashboardShell>
}
