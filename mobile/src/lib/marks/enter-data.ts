import { supabase } from '@/lib/supabase/client';

export type EnterRosterStudent = { id: string; full_name: string; roll_number: string; grade: string; section: string };
export type ExistingMark = { student_id: string; subject: string; exam_type: string; score: number };

// Ported from the web's lib/marks/enter-data.ts.
export async function fetchMarksEntryData(): Promise<{ roster: EnterRosterStudent[]; existingMarks: ExistingMark[] }> {
  const [studentsRes, marksRes] = await Promise.all([
    supabase.from('students').select('id, full_name, roll_number, grade_level, section').is('deleted_at', null).eq('status', 'active'),
    supabase.from('marks').select('student_id, subject, exam_type, score'),
  ]);

  const roster = (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    roll_number: s.roll_number,
    grade: s.grade_level,
    section: s.section,
  }));

  return { roster, existingMarks: marksRes.data ?? [] };
}
