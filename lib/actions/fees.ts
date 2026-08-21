'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import type { Database } from '@/types/supabase'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// Defense in depth — RLS's super_admin_full_access policy on fee_payments is
// the real boundary; this just fails fast with a clean error.
async function requireSuperAdminCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

const SetFeeStatusSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1).max(200),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  status: z.enum(['paid', 'unpaid']),
})

export async function setFeeStatusAction(
  input: z.infer<typeof SetFeeStatusSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = SetFeeStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const { error } = await supabase
    .from('fee_payments')
    .upsert(
      {
        student_id: parsed.data.studentId,
        year: parsed.data.year,
        month: parsed.data.month,
        status: parsed.data.status,
        marked_by: userId,
      },
      { onConflict: 'student_id,year,month' },
    )

  if (error) return { ok: false as const, error: 'Could not update fee status.' }

  await logAction(
    supabase,
    userId,
    `Marked fee ${parsed.data.status} — ${parsed.data.studentName} · ${MONTH_NAMES[parsed.data.month - 1]} ${parsed.data.year}`,
  )

  return { ok: true as const }
}
