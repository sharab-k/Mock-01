import { supabase } from '@/lib/supabase/client';
import { fetchAllRows } from '@/lib/db/fetch-all';

export type EnterRosterStudent = { id: string; full_name: string; roll_number: string; grade: string; section: string };
export type ExistingMark = { student_id: string; score: number; max_score: number };

// Mirrors the web's lib/marks/enter-data.ts: just the roster. The marks already
// saved for the selected class/subject/exam/date are fetched on demand
// (fetchExistingMarks) instead of downloading every mark in the school.
export async function fetchMarksEntryData(): Promise<{ roster: EnterRosterStudent[] }> {
  const students = await fetchAllRows((from, to) =>
    supabase
      .from('students')
      .select('id, full_name, roll_number, grade_level, section')
      .is('deleted_at', null)
      .eq('status', 'active')
      .order('list_sort', { ascending: true })
      .order('id')
      .range(from, to),
  );

  return {
    roster: students.map((s) => ({
      id: s.id,
      full_name: s.full_name,
      roll_number: s.roll_number,
      grade: s.grade_level,
      section: s.section,
    })),
  };
}

export async function fetchExistingMarks(input: {
  grade: string;
  section: string;
  subject: string;
  examType: 'monthly' | 'half_yearly' | 'final';
  examDate: string;
}): Promise<ExistingMark[]> {
  const { data } = await supabase.rpc('marks_existing', {
    p_grade: input.grade,
    p_section: input.section,
    p_subject: input.subject,
    p_exam_type: input.examType,
    p_date: input.examDate,
  });
  return (data ?? []).map((m) => ({ student_id: m.student_id, score: m.score, max_score: m.max_score }));
}
