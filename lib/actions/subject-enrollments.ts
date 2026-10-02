'use server'

import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'
import type { Database } from '@/types/supabase'

async function requireSuperAdminCaller(supabaseOverride?: SupabaseClient<Database>) {
  const supabase = supabaseOverride ?? await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

export type EnrollmentRosterStudent = {
  id: string
  fullName: string
  rollNumber: string
  enrolled: boolean
}

// The class roster (every active student in the subject's grade) with each
// one flagged for whether they're already enrolled in this elected subject
// — what the bulk-enroll screen renders as a checkbox list.
export async function fetchSubjectEnrollmentRoster(
  subjectId: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; gradeLevel: string; subjectName: string; roster: EnrollmentRosterStudent[] } | { ok: false; error: string }> {
  const supabase = supabaseOverride ?? await createClient()

  const { data: subject } = await supabase.from('subjects').select('grade_level, name, type').eq('id', subjectId).single()
  if (!subject) return { ok: false, error: 'Subject not found.' }
  if (subject.type !== 'elected') return { ok: false, error: 'Only elected subjects need enrollment — every student in the grade already takes compulsory subjects.' }

  const [studentsRes, enrolledRes] = await Promise.all([
    supabase.from('students').select('id, full_name, roll_number').is('deleted_at', null).eq('status', 'active').eq('grade_level', subject.grade_level).order('roll_number', { ascending: true }),
    supabase.from('student_subject_enrollments').select('student_id').eq('subject_id', subjectId),
  ])

  const enrolledIds = new Set((enrolledRes.data ?? []).map((r) => r.student_id))
  const roster = (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    fullName: s.full_name,
    rollNumber: s.roll_number,
    enrolled: enrolledIds.has(s.id),
  }))

  roster.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }))
  return { ok: true, gradeLevel: subject.grade_level, subjectName: subject.name, roster }
}

const SetEnrollmentSchema = z.object({
  subjectId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()),
})

// Replaces the full enrollment set for this subject with exactly the given
// student list — the bulk checkbox screen always sends its complete desired
// state, so a diff-and-apply (delete what's no longer checked, insert
// what's newly checked) is simpler and less error-prone than the caller
// tracking individual add/remove actions itself.
export async function setSubjectEnrollmentAction(
  input: z.infer<typeof SetEnrollmentSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SetEnrollmentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid enrollment list.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { subjectId, studentIds } = parsed.data

  const { data: subject } = await supabase.from('subjects').select('name, type').eq('id', subjectId).single()
  if (!subject) return { ok: false, error: 'Subject not found.' }
  if (subject.type !== 'elected') return { ok: false, error: 'Only elected subjects take enrollment.' }

  const { error: deleteError } = await supabase.from('student_subject_enrollments').delete().eq('subject_id', subjectId)
  if (deleteError) return { ok: false, error: 'Could not update enrollment. Please try again.' }

  if (studentIds.length > 0) {
    const { error: insertError } = await supabase.from('student_subject_enrollments').insert(
      studentIds.map((studentId) => ({ subject_id: subjectId, student_id: studentId, enrolled_by: userId })),
    )
    if (insertError) return { ok: false, error: 'Could not save enrollment. Please try again.' }
  }

  await logAction(supabase, userId, `Set ${subject.name} enrollment — ${studentIds.length} student${studentIds.length === 1 ? '' : 's'}`)
  return { ok: true }
}

export type StudentSubjectRow = { id: string; name: string; type: 'compulsory' | 'elected'; enrolled: boolean }

// One student's view of their grade's subject list — compulsory subjects are
// implicit (always enrolled), elected ones carry whether this student has an
// enrollment row. What the student edit drawer's Subjects section renders.
export async function fetchStudentSubjects(
  studentId: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; subjects: StudentSubjectRow[] } | { ok: false; error: string }> {
  const supabase = supabaseOverride ?? await createClient()

  const { data: student } = await supabase.from('students').select('grade_level').eq('id', studentId).single()
  if (!student) return { ok: false, error: 'Student not found.' }

  const [subjectsRes, enrolledRes] = await Promise.all([
    supabase.from('subjects').select('id, name, type').eq('grade_level', student.grade_level).is('deleted_at', null).order('name', { ascending: true }),
    supabase.from('student_subject_enrollments').select('subject_id').eq('student_id', studentId),
  ])

  const enrolledIds = new Set((enrolledRes.data ?? []).map((r) => r.subject_id))
  return {
    ok: true,
    subjects: (subjectsRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      enrolled: s.type === 'compulsory' || enrolledIds.has(s.id),
    })),
  }
}

const SetStudentElectivesSchema = z.object({
  studentId: z.string().uuid(),
  subjectIds: z.array(z.string().uuid()),
})

// Replaces this one student's elected-subject set with exactly the given
// list — the per-student counterpart to setSubjectEnrollmentAction's
// per-subject bulk replace. Only subjects of the student's own grade that
// are actually elected are honoured; anything else in the list is ignored.
export async function setStudentElectivesAction(
  input: z.infer<typeof SetStudentElectivesSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SetStudentElectivesSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid subject list.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { studentId, subjectIds } = parsed.data

  const { data: student } = await supabase.from('students').select('full_name, grade_level').eq('id', studentId).single()
  if (!student) return { ok: false, error: 'Student not found.' }

  const { data: electives } = await supabase
    .from('subjects')
    .select('id')
    .eq('grade_level', student.grade_level)
    .eq('type', 'elected')
    .is('deleted_at', null)
  const validIds = new Set((electives ?? []).map((s) => s.id))
  const wanted = Array.from(new Set(subjectIds.filter((id) => validIds.has(id))))

  const { error: deleteError } = await supabase.from('student_subject_enrollments').delete().eq('student_id', studentId)
  if (deleteError) return { ok: false, error: 'Could not update the subjects. Please try again.' }

  if (wanted.length > 0) {
    const { error: insertError } = await supabase.from('student_subject_enrollments').insert(
      wanted.map((subjectId) => ({ student_id: studentId, subject_id: subjectId, enrolled_by: userId })),
    )
    if (insertError) return { ok: false, error: 'Could not save the subjects. Please try again.' }
  }

  await logAction(supabase, userId, `Updated elected subjects — ${student.full_name} · ${wanted.length} elected`)
  return { ok: true }
}
