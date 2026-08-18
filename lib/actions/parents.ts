'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAction } from '@/lib/audit/log'
import type { Database } from '@/types/supabase'

// Defense in depth — RLS is the real boundary on profiles; this just fails
// fast with a clean error instead of letting a wrong-role caller hit a
// Postgres RLS rejection. Both Super Admin (owns everything) and Admissions
// Admin (owns parent/student account creation) can reset a parent's password.
async function requireParentPasswordCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const authorized = !!profile && ['super_admin', 'admissions_admin'].includes(profile.role)
  return { supabase, userId: user.id, authorized }
}

const SetPasswordSchema = z.object({ id: z.string().uuid(), newPassword: z.string().min(8).max(200) })

export async function setParentPasswordAction(
  input: z.infer<typeof SetPasswordSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = SetPasswordSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireParentPasswordCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  // profiles has no RLS policy letting one user read/update another's row, by
  // design — only the service-role client can look up and reset another
  // account's password.
  const admin = createAdminClient()
  const { data: target } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', parsed.data.id)
    .eq('role', 'parent')
    .maybeSingle()

  if (!target) return { ok: false as const, error: 'Parent account not found.' }

  const { error } = await admin.auth.admin.updateUserById(parsed.data.id, { password: parsed.data.newPassword })
  if (error) return { ok: false as const, error: 'Could not update the password.' }

  await logAction(supabase, userId, `Password reset — ${target.full_name} (parent)`)

  return { ok: true as const }
}
