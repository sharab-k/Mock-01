import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { STAFF_ROLES, STAFF_ROLE_LABEL, type StaffRole } from '@/lib/staff/roles'

export type StaffMember = {
  id: string
  name: string
  role: string
  email: string
  phone: string
  lastLogin: string
  status: 'Active' | 'Inactive'
}

function formatLastLogin(iso: string | null | undefined): string {
  if (!iso) return 'Never signed in'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).replace(',', ',')
}

// profiles has no RLS policy letting one user read another's row (by design,
// see lib/supabase/admin.ts) — the (super-admin) layout already gates this
// page to super_admin, so the service-role client is what actually performs
// the cross-account read, same pattern as lib/admissions/parent-lookup.ts.
export async function fetchStaffDirectory(): Promise<StaffMember[]> {
  const admin = createAdminClient()

  const { data: rows } = await admin
    .from('profiles')
    .select('id, full_name, role, email, phone, is_active')
    .in('role', STAFF_ROLES)
    .order('full_name', { ascending: true })

  if (!rows || rows.length === 0) return []

  // supabase-js has no "get users by id list" — listUsers() then filter is
  // the only Admin API path; a generous perPage avoids a second page for
  // any realistic staff headcount at this school's scale.
  const { data: usersPage } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const lastLoginById = new Map((usersPage?.users ?? []).map((u) => [u.id, u.last_sign_in_at]))

  return rows.map((r) => ({
    id: r.id,
    name: r.full_name ?? r.email,
    role: STAFF_ROLE_LABEL[r.role as StaffRole] ?? r.role,
    email: r.email,
    phone: r.phone ?? '—',
    lastLogin: formatLastLogin(lastLoginById.get(r.id)),
    status: r.is_active ? 'Active' : 'Inactive',
  }))
}
