import { supabase } from '@/lib/supabase/client';
import { FIRST_YEAR_GRADE, isUnplaced, studentInSubjectList, type Faculty, type SubjectGrade } from '@/lib/attendance/first-year-subjects';

export type SubjectStatus = 'unmarked' | 'present' | 'absent' | 'late' | 'leave';

export type SubjectRosterStudent = {
  id: string;
  name: string;
  roll: string;
  gr: string | null;
  stream: string | null;
  status: SubjectStatus;
};

export type SubjectRoster = { students: SubjectRosterStudent[]; unplaced: number };

// Ported from the web's lib/attendance/subject-roster.ts: First or Second Year students of the
// section who study the chosen subject (optionally one faculty), with whatever is
// already marked for that subject on that date. Runs on the staff member's own
// RLS-scoped session.
export async function fetchSubjectRoster(input: { section: string; classDate: string; subject: string; faculty: Faculty | null; grade?: SubjectGrade }): Promise<SubjectRoster> {
  const grade = input.grade ?? FIRST_YEAR_GRADE;
  const { data: all, error } = await supabase
    .from('students')
    .select('id, roll_number, gr_number, full_name, stream')
    .eq('grade_level', grade)
    .eq('section', input.section)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('list_sort', { ascending: true });
  if (error) throw new Error('Could not load the class.');

  const everyone = all ?? [];
  const listed = everyone.filter((s) => studentInSubjectList(s.stream, input.subject, input.faculty, grade));
  const unplaced = input.faculty ? 0 : everyone.filter((s) => isUnplaced(s.stream, input.subject, grade)).length;
  if (listed.length === 0) return { students: [], unplaced };

  const { data: records } = await supabase
    .from('attendance_records')
    .select('student_id, status')
    .eq('class_date', input.classDate)
    .eq('subject', input.subject)
    .in('student_id', listed.map((s) => s.id));
  const statusById = new Map((records ?? []).map((r) => [r.student_id, r.status as SubjectStatus]));

  return {
    unplaced,
    students: listed.map((s) => ({
      id: s.id,
      name: s.full_name,
      roll: s.roll_number,
      gr: s.gr_number,
      stream: s.stream,
      status: statusById.get(s.id) ?? 'unmarked',
    })),
  };
}
