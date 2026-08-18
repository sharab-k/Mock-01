import AttendanceClassDetailContent from '@/components/dashboard/modules/AttendanceClassDetailContent'
import { fetchClassRoster } from '@/lib/attendance/roster'
import { sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'

const VALID_GRADES = ['9', '10', '11', '12']

export default async function ClassRosterPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = await params
  const isValid = VALID_GRADES.includes(grade) && sectionsForGrade(grade as Grade).includes(section as Section)
  const students = isValid ? await fetchClassRoster(grade, section) : []

  return <AttendanceClassDetailContent grade={grade} section={section} basePath="/attendance" students={students} />
}
