import SuperAdminStudentDirectoryContent, { type DirectoryStudent } from '@/components/dashboard/modules/SuperAdminStudentDirectoryContent'
import { createClient } from '@/lib/supabase/server'
import { fetchParentContactsByStudentId } from '@/lib/admissions/parent-lookup'
import { GRADES } from '@/lib/students/constants'

export default async function SuperAdminStudentsPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('students')
    .select('id, roll_number, registration_number, full_name, grade_level, section, program, status, enrollment_date, is_late_enrollment, guardian_profession, previous_school, last_qualification, address, gr_number, registration_fee, tuition_fee, stream')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const contactByStudent = await fetchParentContactsByStudentId((rows ?? []).map((s) => s.id))

  const students: DirectoryStudent[] = (rows ?? []).map((s) => ({
    id: s.id,
    roll_number: s.roll_number,
    registration_number: s.registration_number,
    full_name: s.full_name,
    grade: s.grade_level,
    section: s.section,
    program: s.program,
    status: s.status === 'active' ? 'Active' : 'Inactive',
    enrollment_date: new Date(s.enrollment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    is_late_enrollment: s.is_late_enrollment,
    parent_name: contactByStudent.get(s.id)?.name ?? '—',
    parent_phone: contactByStudent.get(s.id)?.phone ?? '—',
    guardian_profession: s.guardian_profession,
    previous_school: s.previous_school,
    last_qualification: s.last_qualification,
    address: s.address,
    gr_number: s.gr_number,
    registration_fee: s.registration_fee,
    tuition_fee: s.tuition_fee,
    stream: s.stream,
  }))

  return <SuperAdminStudentDirectoryContent students={students} grades={GRADES} />
}
