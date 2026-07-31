import AdmissionsStudentDirectoryContent, { type DirectoryStudent } from '@/components/dashboard/modules/AdmissionsStudentDirectoryContent'
import { createClient } from '@/lib/supabase/server'
import { fetchParentNamesByStudentId } from '@/lib/admissions/parent-lookup'

export default async function AdmissionsStudentsPage() {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section, status')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const parentByStudent = await fetchParentNamesByStudentId((rows ?? []).map((s) => s.id))

  const students: DirectoryStudent[] = (rows ?? []).map((s) => ({
    id: s.id,
    full_name: s.full_name,
    roll_number: s.roll_number,
    grade: s.grade_level,
    section: s.section,
    parent_name: parentByStudent.get(s.id) ?? null,
    status: s.status === 'active' ? 'Active' : 'Inactive',
  }))

  return <AdmissionsStudentDirectoryContent initialStudents={students} />
}
