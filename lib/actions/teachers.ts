'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'

async function requireSuperAdminCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

const TeacherInputSchema = z.object({
  fullName: z.string().min(1).max(200),
  subject: z.string().min(1).max(100),
  classes: z.array(z.string().min(1).max(20)).max(30),
  email: z.string().email().max(200).optional().or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
})

export async function createTeacherAction(input: z.infer<typeof TeacherInputSchema>) {
  const parsed = TeacherInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid teacher details.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller()
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const { fullName, subject, classes, email, phone } = parsed.data
  const { data, error } = await supabase
    .from('teachers')
    .insert({ full_name: fullName, subject, classes, email: email || null, phone: phone || null })
    .select('id')
    .single()

  if (error || !data) return { ok: false as const, error: 'Could not add the teacher.' }

  await logAction(supabase, userId, `Added teacher — ${fullName} · ${subject}`)

  return { ok: true as const, id: data.id }
}

const UpdateTeacherSchema = TeacherInputSchema.extend({ id: z.string().uuid() })

export async function updateTeacherAction(input: z.infer<typeof UpdateTeacherSchema>) {
  const parsed = UpdateTeacherSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid teacher details.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller()
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const { id, fullName, subject, classes, email, phone } = parsed.data
  const { error } = await supabase
    .from('teachers')
    .update({ full_name: fullName, subject, classes, email: email || null, phone: phone || null })
    .eq('id', id)

  if (error) return { ok: false as const, error: 'Could not update the teacher.' }

  await logAction(supabase, userId, `Edited teacher — ${fullName} · ${subject}`)

  return { ok: true as const }
}

const IdSchema = z.object({ id: z.string().uuid() })

export async function deleteTeacherAction(input: z.infer<typeof IdSchema>) {
  const parsed = IdSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller()
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const { data, error } = await supabase
    .from('teachers')
    .delete()
    .eq('id', parsed.data.id)
    .select('full_name, subject')
    .single()

  if (error) return { ok: false as const, error: 'Could not remove the teacher.' }

  await logAction(supabase, userId, `Removed teacher — ${data.full_name} · ${data.subject}`)

  return { ok: true as const }
}
