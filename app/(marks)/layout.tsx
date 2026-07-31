import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireRole } from '@/lib/auth/require-role'

export default async function MarksLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('marks_admin')
  return <DashboardShell user={user}>{children}</DashboardShell>
}
