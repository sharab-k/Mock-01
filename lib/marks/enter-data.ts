import { createClient } from '@/lib/supabase/server'

export type EnterRosterStudent = { id: string; full_name: string; roll_number: string; grade: string; section: string }
export type ExistingMark = { student_id: string; subject: string; exam_type: string; score: number }

export async function fetchMarksEntryData(): Promise<{ roster: EnterRosterStudent[]; existingMarks: ExistingMark[] }> {
  const supabase = await createClient()
  const [studentsRes, marksRes] = await Promise.all([
    supabase.from('students').select('id, full_name, roll_number, grade_level, section').is('deleted_at', null).eq('status', 'active').order('gr_number', { ascending: true }),
    supabase.from('marks').select('student_id, subject, exam_type, score'),
  ])

  const roster = (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    roll_number: s.roll_number,
    grade: s.grade_level,
    section: s.section,
  }))

  return { roster, existingMarks: marksRes.data ?? [] }
}
