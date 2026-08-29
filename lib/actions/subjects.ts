'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import { GRADES } from '@/lib/students/constants'
import type { Database } from '@/types/supabase'

async function requireSuperAdminCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

export type Subject = {
  id: string
  gradeLevel: string
  name: string
  type: 'compulsory' | 'elected'
  createdAt: string
}

// Every subject across every grade, in one call — the Subjects screen groups
// them client-side by grade rather than round-tripping per grade tab.
export async function fetchSubjects(supabaseOverride?: SupabaseClient<Database>): Promise<Subject[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase
    .from('subjects')
    .select('id, grade_level, name, type, created_at')
    .is('deleted_at', null)
    .order('grade_level', { ascending: true })
    .order('name', { ascending: true })

  return (data ?? []).map((s) => ({
    id: s.id,
    gradeLevel: s.grade_level,
    name: s.name,
    type: s.type,
    createdAt: s.created_at,
  }))
}

const CreateSubjectSchema = z.object({
  gradeLevel: z.enum(GRADES as [string, ...string[]]),
  name: z.string().min(1).max(100),
  type: z.enum(['compulsory', 'elected']),
})

export async function createSubjectAction(
  input: z.infer<typeof CreateSubjectSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = CreateSubjectSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid subject details.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { gradeLevel, name, type } = parsed.data
  const { data, error } = await supabase
    .from('subjects')
    .insert({ grade_level: gradeLevel, name, type, created_by: userId })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { ok: false, error: `${name} already exists for Grade ${gradeLevel}.` }
    return { ok: false, error: 'Could not create the subject. Please try again.' }
  }

  await logAction(supabase, userId, `Added subject — ${name} (${type}) · Grade ${gradeLevel}`)
  return { ok: true, id: data.id }
}

const RemoveSubjectSchema = z.object({ id: z.string().uuid() })

export async function removeSubjectAction(
  input: z.infer<typeof RemoveSubjectSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = RemoveSubjectSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid subject.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { data: subject } = await supabase.from('subjects').select('name, grade_level').eq('id', parsed.data.id).single()

  // Soft delete — see the subjects migration's note: existing tests/marks
  // recorded against this subject stay intact, it just stops being
  // assignable to new tests or enrollments going forward.
  const { error } = await supabase.from('subjects').update({ deleted_at: new Date().toISOString() }).eq('id', parsed.data.id)
  if (error) return { ok: false, error: 'Could not remove the subject. Please try again.' }

  if (subject) await logAction(supabase, userId, `Removed subject — ${subject.name} · Grade ${subject.grade_level}`)
  return { ok: true }
}
