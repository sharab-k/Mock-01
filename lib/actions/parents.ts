'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { logAction } from '@/lib/audit/log'
import { readParentPassword, storeParentPassword } from '@/lib/auth/credential-vault'
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

  // Replace the recoverable copy so "Show password" always matches the live one.
  const recorded = await storeParentPassword(parsed.data.id, parsed.data.newPassword, userId)

  await logAction(supabase, userId, `Password reset — ${target.full_name} (parent)`)

  return { ok: true as const, recorded }
}

const RevealSchema = z.object({ id: z.string().uuid() })

// Super Admin only — deliberately NOT Admissions Admin, who can reset a parent's
// password but can't read it back. Every reveal is written to the audit log
// (who looked at whose password), and the decrypted value is returned to the
// caller only, never stored in any list or sent to the client in bulk.
export async function revealParentPasswordAction(
  input: z.infer<typeof RevealSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; password: string } | { ok: false; error: string; reason?: 'not_recorded' | 'key_missing' | 'key_mismatch' }> {
  const parsed = RevealSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid request.' }

  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authorized.' }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { ok: false, error: 'Not authorized.' }

  const admin = createAdminClient()
  const { data: target } = await admin.from('profiles').select('full_name').eq('id', parsed.data.id).eq('role', 'parent').maybeSingle()
  if (!target) return { ok: false, error: 'Parent account not found.' }

  const lookup = await readParentPassword(parsed.data.id)
  if (!lookup.ok) {
    return {
      ok: false,
      reason: lookup.reason,
      error:
        lookup.reason === 'not_recorded' ? 'No password is on record for this parent — set a new one to record it.'
        : lookup.reason === 'key_missing' ? 'This server has no CREDENTIAL_ENCRYPTION_KEY set. Add it in Vercel → Settings → Environment Variables (same value as in .env.local), then redeploy.'
        : 'The CREDENTIAL_ENCRYPTION_KEY on this server does not match the key the passwords were saved with. Use the same value everywhere (copy it from .env.local).',
    }
  }

  await logAction(supabase, user.id, `Viewed parent password — ${target.full_name}`)
  return { ok: true, password: lookup.password }
}

const UpdateParentContactSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  phone: z.string().min(1).max(20),
  secondaryPhone: z.string().max(20).optional(),
  whatsapp2: z.string().max(20).optional(),
})

// Edits a linked parent's contact details from the student edit form (part
// of the "whole admission form" a Super Admin or Admissions Admin can now
// revise post-enrolment) — same service-role requirement as
// setParentPasswordAction, since profiles has no RLS letting one user
// update another's row.
export async function updateParentContactAction(
  input: z.infer<typeof UpdateParentContactSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = UpdateParentContactSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireParentPasswordCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const admin = createAdminClient()
  const { data: target } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', parsed.data.id)
    .eq('role', 'parent')
    .maybeSingle()

  if (!target) return { ok: false as const, error: 'Parent account not found.' }

  const { error } = await admin
    .from('profiles')
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone,
      secondary_phone: parsed.data.secondaryPhone || null,
      whatsapp_number_2: parsed.data.whatsapp2 || null,
    })
    .eq('id', parsed.data.id)

  if (error) return { ok: false as const, error: 'Could not update the parent contact details.' }

  await logAction(supabase, userId, `Updated parent contact — ${parsed.data.fullName}`)

  return { ok: true as const }
}
