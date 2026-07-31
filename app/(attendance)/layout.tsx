import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireRole } from '@/lib/auth/require-role'

export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('attendance_admin')
  return <DashboardShell user={user}>{children}</DashboardShell>
}
