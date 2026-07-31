import DashboardShell from '@/components/dashboard/DashboardShell'
import { requireParentAccessToChild } from '@/lib/auth/require-parent-access'

export default async function StudentChildLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const { user } = await requireParentAccessToChild(studentId)

  return (
    <DashboardShell user={user} studentPortalId={studentId}>
      {children}
    </DashboardShell>
  )
}
