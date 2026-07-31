import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireRole } from '@/lib/auth/require-role'

export default async function ParentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('parent')
  return <DashboardShell user={user}>{children}</DashboardShell>
}
