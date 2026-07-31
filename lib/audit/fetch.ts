import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { isFlaggedAction } from './flagged'

export type AuditEntry = {
  id: string
  actor: string
  action: string
  time: string
  date: string
  flag: boolean
}

// audit_log's own RLS already restricts SELECT to super_admin, but the
// embedded profiles(full_name) join still needs the service-role client —
// profiles has no policy letting one user read another's row (by design).
// The (super-admin) layout already gates every caller of this to super_admin.
export async function fetchAuditLog(limit = 200): Promise<AuditEntry[]> {
  const admin = createAdminClient()

  const { data } = await admin
    .from('audit_log')
    .select('id, action, created_at, profiles(full_name, email)')
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data ?? []).map((row) => {
    const created = new Date(row.created_at)
    return {
      id: row.id,
      actor: row.profiles?.full_name ?? row.profiles?.email ?? 'Deleted account',
      action: row.action,
      time: created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      date: created.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      flag: isFlaggedAction(row.action),
    }
  })
}
