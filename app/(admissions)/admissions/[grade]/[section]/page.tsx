import AdmissionsClassDetailContent, { type ClassDetailStudent } from '@/components/dashboard/modules/AdmissionsClassDetailContent'
import { createClient } from '@/lib/supabase/server'
import { fetchParentEditContactsByStudentId } from '@/lib/admissions/parent-lookup'
import { GRADES, sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'

async function fetchClassStudents(grade: string, section: string): Promise<ClassDetailStudent[]> {
  const supabase = await createClient()
  const { data: rows } = await supabase
    .from('students')
    .select(`
      id, roll_number, full_name, grade_level, section, enrollment_date, program,
      is_late_enrollment, stream, guardian_profession, previous_school, last_qualification,
      address, gr_number, registration_fee, tuition_fee
    `)
    .eq('grade_level', grade)
    .eq('section', section)
    .is('deleted_at', null)
    .order('gr_number', { ascending: true })

  const parentByStudent = await fetchParentEditContactsByStudentId((rows ?? []).map((s) => s.id))

  return (rows ?? []).map((s) => {
    const parent = parentByStudent.get(s.id)
    return {
      id: s.id,
      name: s.full_name,
      roll: s.roll_number,
      grade: s.grade_level,
      section: s.section,
      program: s.program,
      isLate: s.is_late_enrollment,
      stream: s.stream,
      guardianProfession: s.guardian_profession,
      previousSchool: s.previous_school,
      lastQualification: s.last_qualification,
      address: s.address,
      grNumber: s.gr_number,
      registrationFee: s.registration_fee,
      tuitionFee: s.tuition_fee,
      parentId: parent?.id ?? null,
      parentName: parent?.name ?? null,
      parentPhone: parent?.phone ?? null,
      parentSecondaryPhone: parent?.secondaryPhone ?? null,
      parentWhatsapp2: parent?.whatsapp2 ?? null,
      credentialSent: true,
      pdfReady: false,
      date: new Date(s.enrollment_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
    }
  })
}

export default async function ClassPipelinePage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = await params
  const isValid = GRADES.includes(grade as Grade) && sectionsForGrade(grade as Grade).includes(section as Section)
  const students = isValid ? await fetchClassStudents(grade, section) : []

  return <AdmissionsClassDetailContent grade={grade} section={section} basePath="/admissions" students={students} />
}
