'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/supabase'

const UpdateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['unread', 'contacted', 'awaiting_visit', 'enrolled', 'declined']),
})

export async function updateEnquiryStatusAction(
  input: z.infer<typeof UpdateStatusSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = UpdateStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admissions_admin', 'super_admin'].includes(profile.role)) {
    return { ok: false as const, error: 'Not authorized.' }
  }

  const { error } = await supabase
    .from('admission_enquiries')
    .update({ status: parsed.data.status })
    .eq('id', parsed.data.id)

  if (error) return { ok: false as const, error: 'Could not update enquiry status.' }
  return { ok: true as const }
}
