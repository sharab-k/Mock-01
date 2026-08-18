import AdmissionsClassDetailContent, { type ClassDetailStudent } from '@/components/dashboard/modules/AdmissionsClassDetailContent'
import { createClient } from '@/lib/supabase/server'
import { fetchParentNamesByStudentId } from '@/lib/admissions/parent-lookup'
import { sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'

const VALID_GRADES = ['9', '10', '11', '12']

async function fetchClassStudents(grade: string, section: string): Promise<ClassDetailStudent[]> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('students')
    .select('id, roll_number, full_name, grade_level, section, enrollment_date')
    .eq('grade_level', grade)
    .eq('section', section)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const parentByStudent = await fetchParentNamesByStudentId((rows ?? []).map((s) => s.id))

  return (rows ?? []).map((s) => ({
    id: s.id,
    name: s.full_name,
    roll: s.roll_number,
    grade: s.grade_level,
    section: s.section,
    parentName: parentByStudent.get(s.id) ?? null,
    credentialSent: true,
    pdfReady: false,
    date: new Date(s.enrollment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  }))
}

export default async function SuperAdminAdmissionsClassPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = await params
  const isValid = VALID_GRADES.includes(grade) && sectionsForGrade(grade as Grade).includes(section as Section)
  const students = isValid ? await fetchClassStudents(grade, section) : []

  return <AdmissionsClassDetailContent grade={grade} section={section} basePath="/super-admin/admissions" students={students} />
}
