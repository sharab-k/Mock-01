import SuperAdminStudentDirectoryContent, { type DirectoryStudent } from '@/components/dashboard/modules/SuperAdminStudentDirectoryContent'
import { createClient } from '@/lib/supabase/server'
import { fetchAllParentEditContacts } from '@/lib/admissions/parent-lookup'
import { fetchAllRows } from '@/lib/db/fetch-all'
import { GRADES } from '@/lib/students/constants'

export default async function SuperAdminStudentsPage() {
  const supabase = await createClient()
  const now = new Date()

  // Students, their parents' contacts and this month's fee status are
  // independent reads — they used to run one after another (three round trips in
  // a row). Absence of a fee row means unpaid, same convention as
  // lib/fees/roster.ts.
  const [rows, contactByStudent, { data: payments }] = await Promise.all([
    fetchAllRows((from, to) =>
      supabase
        .from('students')
        .select('id, roll_number, registration_number, full_name, grade_level, section, program, status, enrollment_date, is_late_enrollment, guardian_profession, previous_school, last_qualification, address, gr_number, registration_fee, tuition_fee, stream')
        .is('deleted_at', null)
        .order('roll_sort', { ascending: true })
        .order('id')
        .range(from, to),
    ),
    fetchAllParentEditContacts(),
    supabase.from('fee_payments').select('student_id, status').eq('year', now.getFullYear()).eq('month', now.getMonth() + 1),
  ])
  const feeStatusByStudent = new Map((payments ?? []).map((p) => [p.student_id, p.status]))

  const students: DirectoryStudent[] = rows.map((s) => ({
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
    parent_id: contactByStudent.get(s.id)?.id ?? null,
    parent_name: contactByStudent.get(s.id)?.name ?? '—',
    parent_email: contactByStudent.get(s.id)?.email ?? null,
    parent_phone: contactByStudent.get(s.id)?.phone ?? '—',
    guardian_profession: s.guardian_profession,
    previous_school: s.previous_school,
    last_qualification: s.last_qualification,
    address: s.address,
    gr_number: s.gr_number,
    registration_fee: s.registration_fee,
    tuition_fee: s.tuition_fee,
    stream: s.stream,
    fee_status: feeStatusByStudent.get(s.id) ?? 'unpaid',
  }))

  return <SuperAdminStudentDirectoryContent students={students} grades={GRADES} />
}
