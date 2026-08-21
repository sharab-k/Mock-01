import MarksStudentsListContent, { type MarksStudentRow } from '@/components/dashboard/modules/MarksStudentsListContent'
import { createClient } from '@/lib/supabase/server'
import { fetchStudentAverages } from '@/lib/marks/student-averages'

async function fetchStudents(): Promise<MarksStudentRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('students')
    .select('id, full_name, roll_number, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('gr_number', { ascending: true })

  const averages = await fetchStudentAverages()

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    roll_number: s.roll_number,
    grade: s.grade_level,
    section: s.section,
    average: averages.get(s.id)?.average ?? null,
  }))
}

export default async function MarksStudentsPage() {
  const students = await fetchStudents()
  return <MarksStudentsListContent students={students} />
}
