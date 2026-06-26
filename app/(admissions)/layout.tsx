import DashboardShell from '@/components/dashboard/DashboardShell'
import type { UserInfo } from '@/components/dashboard/types'

const MOCK_USER: UserInfo = {
  name:      'Admissions Admin',
  email:     'admissions@jeacademy.edu.pk',
  role:      'admissions_admin',
  roleLabel: 'Admissions',
  roleColor: '#A26D53',
  initials:  'AA',
}

export default function AdmissionsLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell user={MOCK_USER}>{children}</DashboardShell>
}
