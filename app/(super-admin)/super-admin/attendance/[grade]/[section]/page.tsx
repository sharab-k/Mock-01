import AttendanceClassDetailContent from '@/components/dashboard/modules/AttendanceClassDetailContent'
import { fetchClassRoster } from '@/lib/attendance/roster'
import { GRADES, sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'

export default async function SuperAdminAttendanceClassPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = await params
  const isValid = GRADES.includes(grade as Grade) && sectionsForGrade(grade as Grade).includes(section as Section)
  const students = isValid ? await fetchClassRoster(grade, section) : []

  return <AttendanceClassDetailContent grade={grade} section={section} basePath="/super-admin/attendance" students={students} />
}
