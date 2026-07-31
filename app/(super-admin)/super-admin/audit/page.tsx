import SuperAdminAuditContent from '@/components/dashboard/modules/SuperAdminAuditContent'
import { fetchAuditLog } from '@/lib/audit/fetch'

export default async function SuperAdminAuditPage() {
  const entries = await fetchAuditLog()
  return <SuperAdminAuditContent entries={entries} />
}
