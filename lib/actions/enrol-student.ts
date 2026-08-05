'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateUsername, generateTempPassword } from '@/lib/auth/generate-credentials'
import { logAction } from '@/lib/audit/log'

const EnrolInputSchema = z.object({
  studentName: z.string().min(1).max(200),
  grade: z.enum(['9', '10', '11', '12']),
  section: z.enum(['A', 'B', 'C', 'D']),
  program: z.string().min(1).max(100),
  isLate: z.boolean(),
  parentName: z.string().min(1).max(200),
  parentPhone: z.string().min(1).max(20),
  // From the client's paper admission form — all optional, additive to the
  // original enrolment flow.
  guardianProfession: z.string().max(200).optional(),
  previousSchool: z.string().max(300).optional(),
  lastQualification: z.string().max(200).optional(),
  address: z.string().max(500).optional(),
  grNumber: z.string().max(50).optional(),
  registrationFee: z.number().min(0).max(10_000_000).optional(),
  tuitionFee: z.number().min(0).max(10_000_000).optional(),
  // Intermediate-level subject stream (Grade 11-12 only) — paper form's
  // Pre. Eng / Pre. Medical / Comp. Science / Commerce checkboxes.
  stream: z.enum(['Pre-Engineering', 'Pre-Medical', 'Computer Science', 'Commerce']).optional(),
})

export type EnrolStudentInput = z.infer<typeof EnrolInputSchema>

export type EnrolStudentResult =
  | { ok: true; rollNumber: string; parentAccountType: 'new'; username: string; tempPassword: string }
  | { ok: true; rollNumber: string; parentAccountType: 'existing'; username: string }
  | { ok: false; error: string }

// Shared by both /admissions/students/new and /super-admin/admissions/students/new
// (same AdmissionsNewStudentContent component, basePath-parameterized) — one
// Server Action, not duplicated per route.
export async function enrolStudentAction(input: EnrolStudentInput): Promise<EnrolStudentResult> {
  const parsed = EnrolInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid enrolment details.' }
  const data = parsed.data

  // Defense in depth — the route's layout already gates this, but a Server
  // Action is a reachable POST target on its own, so verify here too.
  const supabase = await createClient()
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
    p_gr_number: data.grNumber || undefined,
    p_registration_fee: data.registrationFee ?? undefined,
    p_tuition_fee: data.tuitionFee ?? undefined,
    p_stream: data.stream || undefined,
  })

  if (enrolError || !student) {
    if (createdNewParentId) await admin.auth.admin.deleteUser(createdNewParentId) // compensate
    return { ok: false, error: 'Could not enrol the student. Please try again.' }
  }

  await logAction(supabase, user.id, `Enrolled student — ${data.studentName} · ${student.roll_number} · Grade ${data.grade}-${data.section}`)
  if (createdNewParentId) {
    await logAction(supabase, user.id, `Parent credentials issued — parent of ${data.studentName}`)
  }

  return existingParent
    ? { ok: true, rollNumber: student.roll_number, parentAccountType: 'existing', username }
    : { ok: true, rollNumber: student.roll_number, parentAccountType: 'new', username, tempPassword }
}
