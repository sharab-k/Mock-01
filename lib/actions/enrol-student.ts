'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUsername, generateTempPassword } from '@/lib/auth/generate-credentials'
import { logAction } from '@/lib/audit/log'
import { sectionsForGrade, PROGRAM_GRADE, type Grade, type Section, type Program } from '@/lib/students/constants'
import type { Database } from '@/types/supabase'

const EnrolInputSchema = z.object({
  studentName: z.string().min(1).max(200),
  grade: z.enum(['9', '10', '11', '12', 'ICOM-1', 'ICOM-2']),
  // Grades 9-10 are Girls G1-G3 / Boys B1-B3, 11-12 and ICOM-1/2 are co-ed
  // A-E — the pairing is enforced below via superRefine, this just accepts
  // any valid code across both schemes.
  section: z.enum(['A', 'B', 'C', 'D', 'E', 'G1', 'G2', 'G3', 'B1', 'B2', 'B3']),
  // The programme choice IS the grade choice (SSC-1/2 = grade 9/10, HSC-1/2 =
  // grade 11/12, ICOM-1/2 = the same-named grade) — the pairing is enforced
  // below via superRefine.
  program: z.enum(['SSC-1', 'SSC-2', 'HSC-1', 'HSC-2', 'ICOM-1', 'ICOM-2']),
  isLate: z.boolean(),
  parentName: z.string().min(1).max(200),
  // Primary WhatsApp number — required, used for login-account lookup,
  // sibling matching, and the notification pipeline (unchanged from before
  // this field was split into three). The other two are additional optional
  // contact numbers.
  parentPhone: z.string().min(1).max(20),
  parentSecondaryPhone: z.string().max(20).optional(),
  parentWhatsapp2: z.string().max(20).optional(),
  // From the client's paper admission form — optional except grNumber, which
  // the admin now assigns to every student as a unique office identifier.
  guardianProfession: z.string().max(200).optional(),
  previousSchool: z.string().max(300).optional(),
  lastQualification: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  grNumber: z.string().min(1).max(50),
  registrationFee: z.number().min(0).max(10_000_000).optional(),
  tuitionFee: z.number().min(0).max(10_000_000).optional(),
  // Intermediate-level subject stream (Grade 11-12 only) — paper form's
  // Pre. Eng / Pre. Medical / Comp. Science / Commerce checkboxes.
  stream: z.enum(['Pre-Engineering', 'Pre-Medical', 'Computer Science', 'Commerce']).optional(),
}).superRefine((data, ctx) => {
  if (!sectionsForGrade(data.grade as Grade).includes(data.section as Section)) {
    ctx.addIssue({ code: 'custom', path: ['section'], message: `Section ${data.section} is not valid for Grade ${data.grade}` })
  }
  if (PROGRAM_GRADE[data.program as Program] !== data.grade) {
    ctx.addIssue({ code: 'custom', path: ['program'], message: `Programme ${data.program} does not match Grade ${data.grade}` })
  }
})

export type EnrolStudentInput = z.infer<typeof EnrolInputSchema>

export type EnrolStudentResult =
  | { ok: true; rollNumber: string; registrationNumber: string; parentAccountType: 'new'; username: string; tempPassword: string }
  | { ok: true; rollNumber: string; registrationNumber: string; parentAccountType: 'existing'; username: string }
  | { ok: false; error: string }

// Shared by both /admissions/students/new and /super-admin/admissions/students/new
// (same AdmissionsNewStudentContent component, basePath-parameterized) — one
// Server Action, not duplicated per route.
export async function enrolStudentAction(
  input: EnrolStudentInput,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<EnrolStudentResult> {
  const parsed = EnrolInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid enrolment details.' }
  const data = parsed.data

  // Defense in depth — the route's layout already gates this, but a Server
  // Action is a reachable POST target on its own, so verify here too.
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!callerProfile || !['admissions_admin', 'super_admin'].includes(callerProfile.role)) {
    return { ok: false, error: 'Not authorized to enrol students.' }
  }

  // Service-role client from here — profiles has no policy letting one user
  // read another's row, by design, so finding an existing parent by phone
  // (the sibling case) and creating a new auth.users account both need it.
  const admin = createAdminClient()

  const { data: existingParent } = await admin
    .from('profiles')
    .select('id, email')
    .eq('phone', data.parentPhone)
    .eq('role', 'parent')
    .maybeSingle()

  let parentId: string
  let createdNewParentId: string | null = null
  let username: string
  let tempPassword = ''

  if (existingParent) {
    parentId = existingParent.id
    username = existingParent.email
  } else {
    username = generateUsername(data.parentName)
    tempPassword = generateTempPassword()

    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email: username,
      password: tempPassword,
      email_confirm: true,
    })
    if (createError || !createdUser.user) {
      return { ok: false, error: 'Could not create the parent account. Please try again.' }
    }
    parentId = createdUser.user.id
    createdNewParentId = parentId

    const { error: profileError } = await admin.from('profiles').insert({
      id: parentId,
      role: 'parent',
      full_name: data.parentName,
      phone: data.parentPhone,
      secondary_phone: data.parentSecondaryPhone || null,
      whatsapp_number_2: data.parentWhatsapp2 || null,
      email: username,
    })
    if (profileError) {
      await admin.auth.admin.deleteUser(parentId) // compensate — no orphaned auth user
      return { ok: false, error: 'Could not create the parent profile. Please try again.' }
    }
  }

  // Atomic student + link insert. Runs on the caller's own RLS-scoped
  // session, not the admin client — the enrol_student RPC's RLS policies
  // are what authorize this, not a service-role bypass.
  const { data: student, error: enrolError } = await supabase.rpc('enrol_student', {
    p_full_name: data.studentName,
    p_program: data.program,
    p_grade_level: data.grade,
    p_section: data.section,
    p_is_late_enrollment: data.isLate,
    p_parent_id: parentId,
    p_guardian_profession: data.guardianProfession || undefined,
    p_previous_school: data.previousSchool || undefined,
    p_last_qualification: data.lastQualification || undefined,
    p_address: data.address || undefined,
    p_gr_number: data.grNumber,
    p_registration_fee: data.registrationFee ?? undefined,
    p_tuition_fee: data.tuitionFee ?? undefined,
    p_stream: data.stream || undefined,
  })

  if (enrolError || !student) {
    if (createdNewParentId) await admin.auth.admin.deleteUser(createdNewParentId) // compensate
    if (enrolError?.code === '23505' && enrolError.message.includes('gr_number')) {
      return { ok: false, error: 'That G.R. No. is already assigned to another student.' }
    }
    return { ok: false, error: 'Could not enrol the student. Please try again.' }
  }

  await logAction(supabase, user.id, `Enrolled student — ${data.studentName} · ${student.roll_number} · Reg ${student.registration_number} · Grade ${data.grade}-${data.section}`)
  if (createdNewParentId) {
    await logAction(supabase, user.id, `Parent credentials issued — parent of ${data.studentName}`)
  }

  return existingParent
    ? { ok: true, rollNumber: student.roll_number, registrationNumber: student.registration_number, parentAccountType: 'existing', username }
    : { ok: true, rollNumber: student.roll_number, registrationNumber: student.registration_number, parentAccountType: 'new', username, tempPassword }
}
