import SuperAdminStudentDirectoryContent, { type DirectoryStudent } from '@/components/dashboard/modules/SuperAdminStudentDirectoryContent'
import { createClient } from '@/lib/supabase/server'
import { fetchParentContactsByStudentId } from '@/lib/admissions/parent-lookup'
import { GRADES } from '@/lib/students/constants'

export default async function SuperAdminStudentsPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section, program, status, enrollment_date, is_late_enrollment')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const contactByStudent = await fetchParentContactsByStudentId((rows ?? []).map((s) => s.id))

  const students: DirectoryStudent[] = (rows ?? []).map((s) => ({
    id: s.id,
    roll_number: s.roll_number,
    full_name: s.full_name,
    grade: s.grade_level,
    section: s.section,
    program: s.program,
    status: s.status === 'active' ? 'Active' : 'Inactive',
    enrollment_date: new Date(s.enrollment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    is_late_enrollment: s.is_late_enrollment,
    parent_name: contactByStudent.get(s.id)?.name ?? '—',
    parent_phone: contactByStudent.get(s.id)?.phone ?? '—',
  }))

  return <SuperAdminStudentDirectoryContent students={students} grades={GRADES} />
}
