import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ROLE_DESTINATIONS, type UserRole } from './role-destinations'
import { ROLE_META } from './role-meta'
import type { UserInfo } from '@/components/dashboard/types'

function initialsFrom(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
}

// Called from every protected route group's layout.tsx. This is the real
// access control CLAUDE.md §4 describes: loads the session, reads
// profiles.role, and redirects out if it doesn't match expectedRole.
// Route groups + this check are UX, not the security boundary — RLS is
// (golden rule 8) — but this is what makes wrong-role pages unreachable
// through the app itself.
export async function requireRole(expectedRole: UserRole): Promise<UserInfo> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name, email, is_active')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login?error=no_role')

  // A deactivated staff account loses portal access on its very next
  // request, not just at the next login — matches the "will immediately
  // lose portal access" promise on the deactivate confirmation dialog.
  if (!profile.is_active) {
    await supabase.auth.signOut()
    redirect('/login?error=account_inactive')
  }

  if (profile.role !== expectedRole) {
    redirect(ROLE_DESTINATIONS[profile.role] ?? '/login?error=no_role')
  }

  const meta = ROLE_META[profile.role]
  const name = profile.full_name ?? profile.email

  return {
    name,
    email: profile.email,
    role: profile.role,
    roleLabel: meta.label,
    roleColor: meta.color,
    initials: initialsFrom(name),
  }
}
