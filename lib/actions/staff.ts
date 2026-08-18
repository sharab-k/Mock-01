'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateTempPassword } from '@/lib/auth/generate-credentials'
import { logAction } from '@/lib/audit/log'
import { STAFF_ROLES, STAFF_ROLE_LABEL } from '@/lib/staff/roles'
import type { Database } from '@/types/supabase'

async function requireSuperAdminCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

const CreateStaffSchema = z.object({
  fullName: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(1).max(20),
  role: z.enum(STAFF_ROLES),
})

export type CreateStaffResult =
  | { ok: true; email: string; tempPassword: string }
  | { ok: false; error: string }

export async function createStaffAction(
  input: z.infer<typeof CreateStaffSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<CreateStaffResult> {
  const parsed = CreateStaffSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid administrator details.' }

  const { userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { fullName, email, phone, role } = parsed.data
  const admin = createAdminClient()
  const tempPassword = generateTempPassword()

  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  })
  if (createError || !createdUser.user) {
    return { ok: false, error: 'Could not create the account — the email may already be in use.' }
  }

  const { error: profileError } = await admin.from('profiles').insert({
    id: createdUser.user.id,
    role,
    full_name: fullName,
    phone,
    email,
  })
  if (profileError) {
    await admin.auth.admin.deleteUser(createdUser.user.id) // compensate — no orphaned auth user
    return { ok: false, error: 'Could not create the administrator profile. Please try again.' }
  }

  // Logged on the caller's own session client (audit_log's insert_own_actions
  // policy requires actor_id = auth.uid()), not the admin client used above.
  const supabase = supabaseOverride ?? await createClient()
  await logAction(supabase, userId, `Created administrator — ${fullName} · ${STAFF_ROLE_LABEL[role]}`)

  return { ok: true, email, tempPassword }
}

const SetActiveSchema = z.object({ id: z.string().uuid(), active: z.boolean() })

export async function setStaffActiveAction(
  input: z.infer<typeof SetActiveSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = SetActiveSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  // profiles has no RLS policy letting one user update another's row, by
  // design — only the service-role client can flip another account's status.
  const admin = createAdminClient()
  const { data: target } = await admin
    .from('profiles')
    .select('full_name, role')
    .eq('id', parsed.data.id)
    .in('role', STAFF_ROLES)
    .maybeSingle()

  if (!target) return { ok: false as const, error: 'Administrator not found.' }

  const { error } = await admin.from('profiles').update({ is_active: parsed.data.active }).eq('id', parsed.data.id)
  if (error) return { ok: false as const, error: 'Could not update the account status.' }

  await logAction(supabase, userId, `${parsed.data.active ? 'Reactivated' : 'Deactivated'} administrator — ${target.full_name}`)

  return { ok: true as const }
}

const SetPasswordSchema = z.object({ id: z.string().uuid(), newPassword: z.string().min(8).max(200) })

export async function setStaffPasswordAction(
  input: z.infer<typeof SetPasswordSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = SetPasswordSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', parsed.data.id)
    .in('role', STAFF_ROLES)
    .maybeSingle()

  if (!target) return { ok: false as const, error: 'Administrator not found.' }

  const { error } = await admin.auth.admin.updateUserById(parsed.data.id, { password: parsed.data.newPassword })
  if (error) return { ok: false as const, error: 'Could not update the password.' }

  await logAction(supabase, userId, `Password reset — ${target.full_name}`)

  return { ok: true as const }
}
