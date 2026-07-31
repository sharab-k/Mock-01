'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Defense in depth — RLS's admissions_full_access policy is the real boundary
// on the `students` table; this just fails fast with a clean error instead of
// letting a wrong-role caller hit a Postgres RLS rejection.
async function requireAdmissionsCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const authorized = !!profile && ['admissions_admin', 'super_admin'].includes(profile.role)
  return { supabase, authorized }
}

const UpdateStudentSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  grade: z.enum(['9', '10', '11', '12']),
  section: z.enum(['A', 'B', 'C', 'D']),
})

export async function updateStudentAction(input: z.infer<typeof UpdateStudentSchema>) {
  const parsed = UpdateStudentSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid student details.' }

  const { supabase, authorized } = await requireAdmissionsCaller()
  if (!authorized) return { ok: false as const, error: 'Not authorized.' }

  const { error } = await supabase
    .from('students')
    .update({ full_name: parsed.data.fullName, grade_level: parsed.data.grade, section: parsed.data.section })
    .eq('id', parsed.data.id)

  if (error) return { ok: false as const, error: 'Could not update the student record.' }
  return { ok: true as const }
}

const IdSchema = z.object({ id: z.string().uuid() })

export async function deleteStudentAction(input: z.infer<typeof IdSchema>) {
  const parsed = IdSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, authorized } = await requireAdmissionsCaller()
  if (!authorized) return { ok: false as const, error: 'Not authorized.' }

  const { error } = await supabase
    .from('students')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', parsed.data.id)

  if (error) return { ok: false as const, error: 'Could not delete the student record.' }
  return { ok: true as const }
}

const SetStatusSchema = z.object({ id: z.string().uuid(), status: z.enum(['active', 'inactive']) })

export async function setStudentStatusAction(input: z.infer<typeof SetStatusSchema>) {
  const parsed = SetStatusSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, authorized } = await requireAdmissionsCaller()
  if (!authorized) return { ok: false as const, error: 'Not authorized.' }

  const { error } = await supabase.from('students').update({ status: parsed.data.status }).eq('id', parsed.data.id)
  if (error) return { ok: false as const, error: 'Could not update status.' }
  return { ok: true as const }
}
