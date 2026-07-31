import AttendanceStudentsClient, { type GroupedStudent } from '@/components/dashboard/modules/AttendanceStudentsListContent'
import { createClient } from '@/lib/supabase/server'
import { fetchAttendancePercentages } from '@/lib/attendance/attendance-stats'

async function fetchStudents(): Promise<GroupedStudent[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active')

  const pctByStudent = await fetchAttendancePercentages()

  return (data ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    roll_number: s.roll_number,
    grade: s.grade_level,
    section: s.section,
    attendancePct: pctByStudent.get(s.id)?.pct ?? null,
  }))
}

export default async function AttendanceStudentsPage() {
  const students = await fetchStudents()
  return <AttendanceStudentsClient students={students} />
}
