import { createClient } from '@/lib/supabase/server'

const EXAM_TYPE_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  half_yearly: 'Half-Yearly',
  final: 'Final',
}

export type ClassMark = {
  id: string
  student: string
  roll: string
  subject: string
  exam: string
  score: number
  max: number
}

export async function fetchClassMarks(grade: string, section: string): Promise<ClassMark[]> {
  const supabase = await createClient()

  const { data: students } = await supabase
    .from('students')
    .select('id, roll_number, full_name')
    .eq('grade_level', grade)
    .eq('section', section)
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('gr_number', { ascending: true })

  const studentIds = (students ?? []).map((s) => s.id)
  if (studentIds.length === 0) return []

  const { data: marks } = await supabase
    .from('marks')
    .select('id, student_id, subject, exam_type, score, max_score')
    .in('student_id', studentIds)
    .order('created_at', { ascending: false })

  const studentById = new Map((students ?? []).map((s) => [s.id, s]))

  return (marks ?? []).map((m) => {
    const student = studentById.get(m.student_id)
    return {
      id: m.id,
      student: student?.full_name ?? 'Unknown',
      roll: student?.roll_number ?? '—',
      subject: m.subject,
      exam: EXAM_TYPE_LABEL[m.exam_type] ?? m.exam_type,
      score: m.score,
      max: m.max_score,
    }
  })
}
