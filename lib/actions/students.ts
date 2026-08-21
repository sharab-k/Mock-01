'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import { sectionsForGrade, PROGRAM_GRADE, type Section, type Program } from '@/lib/students/constants'
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

// Mirrors EnrolInputSchema (lib/actions/enrol-student.ts) — Super Admin and
// Admissions Admin can now revise the whole admission form after enrolment,
// not just name/grade/section.
const UpdateStudentSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(200),
  // The programme choice IS the grade choice (SSC-1/2 = grade 9/10, HSC-1/2 =
  // grade 11/12) — same as at enrolment.
  program: z.enum(['SSC-1', 'SSC-2', 'HSC-1', 'HSC-2']),
  // Grades 9-10 are Girls G1-G3 / Boys B1-B3, 11-12 (Intermediate) are co-ed
  // A-E — the pairing is enforced below via superRefine, this just accepts
  // any valid code across both schemes.
  section: z.enum(['A', 'B', 'C', 'D', 'E', 'G1', 'G2', 'G3', 'B1', 'B2', 'B3']),
  isLate: z.boolean(),
  stream: z.enum(['Pre-Engineering', 'Pre-Medical', 'Computer Science', 'Commerce']).optional(),
  guardianProfession: z.string().max(200).optional(),
  previousSchool: z.string().max(300).optional(),
  lastQualification: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  // G.R. No. is locked once set (see updateStudentAction below) — only ever
  // applied if the record doesn't already have one.
  grNumber: z.string().min(1).max(50).optional(),
  registrationFee: z.number().min(0).max(10_000_000).optional(),
  tuitionFee: z.number().min(0).max(10_000_000).optional(),
}).superRefine((data, ctx) => {
  const grade = PROGRAM_GRADE[data.program as Program]
  if (!sectionsForGrade(grade).includes(data.section as Section)) {
    ctx.addIssue({ code: 'custom', path: ['section'], message: `Section ${data.section} is not valid for Grade ${grade}` })
  }
})

export async function updateStudentAction(
  input: z.infer<typeof UpdateStudentSchema>,
  supabaseOverride?: SupabaseClient<Database>,
) {
  const parsed = UpdateStudentSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid student details.' }
  const data = parsed.data
  const grade = PROGRAM_GRADE[data.program as Program]

  const { supabase, authorized } = await requireAdmissionsCaller(supabaseOverride)
  if (!authorized) return { ok: false as const, error: 'Not authorized.' }

  const { error } = await supabase
    .from('students')
    .update({
      full_name: data.fullName,
      grade_level: grade,
      section: data.section,
      program: data.program,
      is_late_enrollment: data.isLate,
      stream: data.stream || null,
      guardian_profession: data.guardianProfession || null,
      previous_school: data.previousSchool || null,
      last_qualification: data.lastQualification || null,
      address: data.address || null,
      registration_fee: data.registrationFee ?? null,
      tuition_fee: data.tuitionFee ?? null,
    })
    .eq('id', data.id)

  if (error) return { ok: false as const, error: 'Could not update the student record.' }

  // G.R. No. is permanent once assigned — this only ever touches a row where
  // it's still NULL, so it can never be overwritten after the fact. The
  // `.is('gr_number', null)` guard makes this atomic and race-safe: if it
  // was already set (by this or a concurrent request), the update simply
  // matches zero rows instead of needing a separate read-then-write check.
  if (data.grNumber) {
    const { error: grError } = await supabase
      .from('students')
      .update({ gr_number: data.grNumber })
      .eq('id', data.id)
      .is('gr_number', null)
    if (grError?.code === '23505') {
      return { ok: false as const, error: 'That G.R. No. is already assigned to another student.' }
    }
  }

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
