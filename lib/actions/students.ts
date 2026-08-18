'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import { sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'
import type { Database } from '@/types/supabase'

// Defense in depth — RLS's admissions_full_access policy is the real boundary
// on the `students` table; this just fails fast with a clean error instead of
// letting a wrong-role caller hit a Postgres RLS rejection.
async function requireAdmissionsCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const authorized = !!profile && ['admissions_admin', 'super_admin'].includes(profile.role)
  return { supabase, userId: user.id, authorized }
}

const UpdateStudentSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  grade: z.enum(['9', '10', '11', '12']),
  // Grades 9-10 are Boys/Girls (B/G), 11-12 (Intermediate) are co-ed (A-D) —
  // the pairing is enforced below via superRefine, this just accepts either alphabet.
  section: z.enum(['A', 'B', 'C', 'D', 'G']),
}).superRefine((data, ctx) => {
  if (!sectionsForGrade(data.grade as Grade).includes(data.section as Section)) {
    ctx.addIssue({ code: 'custom', path: ['section'], message: `Section ${data.section} is not valid for Grade ${data.grade}` })
  }
})

export async function updateStudentAction(
  input: z.infer<typeof UpdateStudentSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = UpdateStudentSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid student details.' }

  const { supabase, authorized } = await requireAdmissionsCaller(supabaseOverride)
  if (!authorized) return { ok: false as const, error: 'Not authorized.' }

  const { error } = await supabase
    .from('students')
    .update({ full_name: parsed.data.fullName, grade_level: parsed.data.grade, section: parsed.data.section })
    .eq('id', parsed.data.id)

  if (error) return { ok: false as const, error: 'Could not update the student record.' }
  return { ok: true as const }
}

const IdSchema = z.object({ id: z.string().uuid() })

export async function deleteStudentAction(
  input: z.infer<typeof IdSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = IdSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireAdmissionsCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const { data, error } = await supabase
    .from('students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', parsed.data.id)
    .select('full_name, roll_number')
    .single()

  if (error) return { ok: false as const, error: 'Could not delete the student record.' }

  await logAction(supabase, userId, `Deleted student — ${data.full_name} · ${data.roll_number}`)

  return { ok: true as const }
}

const SetStatusSchema = z.object({ id: z.string().uuid(), status: z.enum(['active', 'inactive']) })

export async function setStudentStatusAction(
  input: z.infer<typeof SetStatusSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = SetStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, authorized } = await requireAdmissionsCaller(supabaseOverride)
  if (!authorized) return { ok: false as const, error: 'Not authorized.' }

  const { error } = await supabase.from('students').update({ status: parsed.data.status }).eq('id', parsed.data.id)
  if (error) return { ok: false as const, error: 'Could not update status.' }
  return { ok: true as const }
}
