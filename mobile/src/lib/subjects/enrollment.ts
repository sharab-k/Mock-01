import { supabase } from '@/lib/supabase/client';
import { callMobileApi } from '@/lib/api/client';

export type EnrollmentRosterStudent = { id: string; fullName: string; rollNumber: string; enrolled: boolean };

// Ported from the web's lib/actions/subject-enrollments.ts
// fetchSubjectEnrollmentRoster — direct RLS-scoped reads (super_admin's own
// subjects/students/enrollments policies already cover this), no
// service-role client needed.
export async function fetchSubjectEnrollmentRoster(
  subjectId: string,
): Promise<{ ok: true; gradeLevel: string; subjectName: string; roster: EnrollmentRosterStudent[] } | { ok: false; error: string }> {
  const { data: subject } = await supabase.from('subjects').select('grade_level, name, type').eq('id', subjectId).single();
  if (!subject) return { ok: false, error: 'Subject not found.' };
  if (subject.type !== 'elected') return { ok: false, error: 'Only elected subjects need enrollment.' };

  const [studentsRes, enrolledRes] = await Promise.all([
    supabase.from('students').select('id, full_name, roll_number').is('deleted_at', null).eq('status', 'active').eq('grade_level', subject.grade_level).order('roll_number', { ascending: true }),
    supabase.from('student_subject_enrollments').select('student_id').eq('subject_id', subjectId),
  ]);

  const enrolledIds = new Set((enrolledRes.data ?? []).map((r) => r.student_id));
  const roster = (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    fullName: s.full_name,
    rollNumber: s.roll_number,
    enrolled: enrolledIds.has(s.id),
  }));

  return { ok: true, gradeLevel: subject.grade_level, subjectName: subject.name, roster };
}

export async function setSubjectEnrollmentAction(subjectId: string, studentIds: string[]) {
  return callMobileApi(`/api/mobile/subjects/${subjectId}/enrollment`, { studentIds });
}
