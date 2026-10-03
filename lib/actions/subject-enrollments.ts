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
  section: string
  /** Whether this student takes the subject: an enrollment row for an elected
   *  subject, or simply no exclusion row for a compulsory one. */
  enrolled: boolean
}

// The grade's roster (every active student) with each one flagged for whether
// they take this subject — what the bulk screen renders as a checkbox list,
// filterable by class. Works for both kinds: elected subjects default to
// nobody, compulsory ones default to everybody, and Super Admin can change
// either.
export async function fetchSubjectEnrollmentRoster(
  subjectId: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; gradeLevel: string; subjectName: string; subjectType: 'compulsory' | 'elected'; roster: EnrollmentRosterStudent[] } | { ok: false; error: string }> {
  const supabase = supabaseOverride ?? await createClient()

  const { data: subject } = await supabase.from('subjects').select('grade_level, name, type').eq('id', subjectId).single()
  if (!subject) return { ok: false, error: 'Subject not found.' }

  const [studentsRes, enrolledRes, excludedRes] = await Promise.all([
    supabase.from('students').select('id, full_name, roll_number, section').is('deleted_at', null).eq('status', 'active').eq('grade_level', subject.grade_level).order('roll_sort', { ascending: true }),
    supabase.from('student_subject_enrollments').select('student_id').eq('subject_id', subjectId),
    supabase.from('student_subject_exclusions').select('student_id').eq('subject_id', subjectId),
  ])

  const enrolledIds = new Set((enrolledRes.data ?? []).map((r) => r.student_id))
  const excludedIds = new Set((excludedRes.data ?? []).map((r) => r.student_id))
  const roster = (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    fullName: s.full_name,
    rollNumber: s.roll_number,
    section: s.section,
    enrolled: subject.type === 'elected' ? enrolledIds.has(s.id) : !excludedIds.has(s.id),
  }))

  return { ok: true, gradeLevel: subject.grade_level, subjectName: subject.name, subjectType: subject.type, roster }
}

const SetEnrollmentSchema = z.object({
  subjectId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()),
})

// Replaces the full set of students taking this subject with exactly the given
// list — the bulk screen always sends its complete desired state, so a
// diff-and-apply is simpler and less error-prone than tracking individual
// add/remove actions. For an elected subject that's the enrollment rows; for a
// compulsory one it's the exclusion rows (everyone in the grade NOT in the list).
export async function setSubjectEnrollmentAction(
  input: z.infer<typeof SetEnrollmentSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SetEnrollmentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid student list.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { subjectId, studentIds } = parsed.data

  const { data: subject } = await supabase.from('subjects').select('name, type, grade_level').eq('id', subjectId).is('deleted_at', null).single()
  if (!subject) return { ok: false, error: 'Subject not found.' }

  if (subject.type === 'elected') {
    const { error: deleteError } = await supabase.from('student_subject_enrollments').delete().eq('subject_id', subjectId)
    if (deleteError) return { ok: false, error: 'Could not update the students. Please try again.' }

    if (studentIds.length > 0) {
      const { error: insertError } = await supabase.from('student_subject_enrollments').insert(
        studentIds.map((studentId) => ({ subject_id: subjectId, student_id: studentId, enrolled_by: userId })),
      )
      if (insertError) return { ok: false, error: 'Could not save the students. Please try again.' }
    }

    await logAction(supabase, userId, `Set ${subject.name} students — Grade ${subject.grade_level} · ${studentIds.length} student${studentIds.length === 1 ? '' : 's'}`)
    return { ok: true }
  }

  const { data: gradeStudents } = await supabase.from('students').select('id').is('deleted_at', null).eq('status', 'active').eq('grade_level', subject.grade_level)
  const takes = new Set(studentIds)
  const excluded = (gradeStudents ?? []).map((s) => s.id).filter((id) => !takes.has(id))

  const { error: deleteError } = await supabase.from('student_subject_exclusions').delete().eq('subject_id', subjectId)
  if (deleteError) return { ok: false, error: 'Could not update the students. Please try again.' }

  if (excluded.length > 0) {
    const { error: insertError } = await supabase.from('student_subject_exclusions').insert(
      excluded.map((studentId) => ({ subject_id: subjectId, student_id: studentId, excluded_by: userId })),
    )
    if (insertError) return { ok: false, error: 'Could not save the students. Please try again.' }
  }

  await logAction(supabase, userId, `Set ${subject.name} students — Grade ${subject.grade_level} · ${excluded.length} excluded`)
  return { ok: true }
}

export type StudentSubjectRow = { id: string; name: string; type: 'compulsory' | 'elected'; enrolled: boolean }

// One student's view of their grade's subject list. `enrolled` is whether they
// actually take it — compulsory unless excluded, elected only if enrolled.
export async function fetchStudentSubjects(
  studentId: string,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true; subjects: StudentSubjectRow[] } | { ok: false; error: string }> {
  const supabase = supabaseOverride ?? await createClient()

  const { data: student } = await supabase.from('students').select('grade_level').eq('id', studentId).single()
  if (!student) return { ok: false, error: 'Student not found.' }

  const [subjectsRes, enrolledRes, excludedRes] = await Promise.all([
    supabase.from('subjects').select('id, name, type').eq('grade_level', student.grade_level).is('deleted_at', null).order('name', { ascending: true }),
    supabase.from('student_subject_enrollments').select('subject_id').eq('student_id', studentId),
    supabase.from('student_subject_exclusions').select('subject_id').eq('student_id', studentId),
  ])

  const enrolledIds = new Set((enrolledRes.data ?? []).map((r) => r.subject_id))
  const excludedIds = new Set((excludedRes.data ?? []).map((r) => r.subject_id))
  return {
    ok: true,
    subjects: (subjectsRes.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      enrolled: s.type === 'compulsory' ? !excludedIds.has(s.id) : enrolledIds.has(s.id),
    })),
  }
}

const SetStudentSubjectsSchema = z.object({
  studentId: z.string().uuid(),
  /** Every subject this student should take, compulsory and elected alike. */
  subjectIds: z.array(z.string().uuid()),
})

// Sets exactly which subjects one student takes. Elected subjects in the list
// become enrollment rows; compulsory subjects of their grade that are NOT in
// the list become exclusions. Anything not of the student's own grade is ignored.
export async function setStudentSubjectsAction(
  input: z.infer<typeof SetStudentSubjectsSchema>,
  supabaseOverride?: SupabaseClient<Database>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = SetStudentSubjectsSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid subject list.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller(supabaseOverride)
  if (!authorized || !userId) return { ok: false, error: 'Not authorized.' }

  const { studentId, subjectIds } = parsed.data

  const { data: student } = await supabase.from('students').select('full_name, grade_level').eq('id', studentId).single()
  if (!student) return { ok: false, error: 'Student not found.' }

  const { data: gradeSubjects } = await supabase.from('subjects').select('id, type').eq('grade_level', student.grade_level).is('deleted_at', null)
  const picked = new Set(subjectIds)
  const electedOn = (gradeSubjects ?? []).filter((s) => s.type === 'elected' && picked.has(s.id)).map((s) => s.id)
  const compulsoryOff = (gradeSubjects ?? []).filter((s) => s.type === 'compulsory' && !picked.has(s.id)).map((s) => s.id)

  const [delEnroll, delExclude] = await Promise.all([
    supabase.from('student_subject_enrollments').delete().eq('student_id', studentId),
    supabase.from('student_subject_exclusions').delete().eq('student_id', studentId),
  ])
  if (delEnroll.error || delExclude.error) return { ok: false, error: 'Could not update the subjects. Please try again.' }

  if (electedOn.length > 0) {
    const { error } = await supabase.from('student_subject_enrollments').insert(
      electedOn.map((subjectId) => ({ student_id: studentId, subject_id: subjectId, enrolled_by: userId })),
    )
    if (error) return { ok: false, error: 'Could not save the subjects. Please try again.' }
  }
  if (compulsoryOff.length > 0) {
    const { error } = await supabase.from('student_subject_exclusions').insert(
      compulsoryOff.map((subjectId) => ({ student_id: studentId, subject_id: subjectId, excluded_by: userId })),
    )
    if (error) return { ok: false, error: 'Could not save the subjects. Please try again.' }
  }

  await logAction(supabase, userId, `Updated subjects — ${student.full_name} · ${electedOn.length} elected, ${compulsoryOff.length} compulsory removed`)
  return { ok: true }
}
