import AttendanceRosterContent, { type RosterRow } from '@/components/dashboard/modules/AttendanceRosterContent'
import { createClient } from '@/lib/supabase/server'
import { fetchAttendancePercentages } from '@/lib/attendance/attendance-stats'

async function fetchRoster(): Promise<RosterRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section')
    .is('deleted_at', null)
    .eq('status', 'active')
    .order('gr_number', { ascending: true })

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

export default async function SuperAdminAttendanceRosterPage() {
  const students = await fetchRoster()
  return <AttendanceRosterContent basePath="/super-admin/attendance" students={students} />
}
