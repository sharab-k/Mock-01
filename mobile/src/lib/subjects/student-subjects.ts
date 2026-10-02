import { supabase } from '@/lib/supabase/client';
import { callMobileApi } from '@/lib/api/client';

export type StudentSubjectRow = { id: string; name: string; type: 'compulsory' | 'elected'; enrolled: boolean };

// Ported from the web's lib/actions/subject-enrollments.ts fetchStudentSubjects —
// direct RLS-scoped reads (Super Admin's own policies cover all three tables).
export async function fetchStudentSubjects(
  studentId: string,
): Promise<{ ok: true; subjects: StudentSubjectRow[] } | { ok: false; error: string }> {
  const { data: student } = await supabase.from('students').select('grade_level').eq('id', studentId).single();
  if (!student) return { ok: false, error: 'Student not found.' };

  const [subjectsRes, enrolledRes] = await Promise.all([
    supabase.from('subjects').select('id, name, type').eq('grade_level', student.grade_level).is('deleted_at', null).order('name', { ascending: true }),
    supabase.from('student_subject_enrollments').select('subject_id').eq('student_id', studentId),
  ]);

  const enrolledIds = new Set((enrolledRes.data ?? []).map((r) => r.subject_id));
  return {
    ok: true,
    subjects: (subjectsRes.data ?? []).map((s) => ({ id: s.id, name: s.name, type: s.type, enrolled: s.type === 'compulsory' || enrolledIds.has(s.id) })),
  };
}

export async function setStudentElectivesAction(studentId: string, subjectIds: string[]) {
  return callMobileApi(`/api/mobile/students/${studentId}/subjects`, { subjectIds });
}
