import AttendanceClassDetailContent from '@/components/dashboard/modules/AttendanceClassDetailContent'
import { fetchClassRoster } from '@/lib/attendance/roster'

const VALID_GRADES = ['9', '10', '11', '12']
const VALID_SECTIONS = ['A', 'B', 'C', 'D']

export default async function SuperAdminAttendanceClassPage({
  params,
}: {
  params: Promise<{ grade: string; section: string }>
}) {
  const { grade, section } = await params
  const isValid = VALID_GRADES.includes(grade) && VALID_SECTIONS.includes(section)
  const students = isValid ? await fetchClassRoster(grade, section) : []

  return <AttendanceClassDetailContent grade={grade} section={section} basePath="/super-admin/attendance" students={students} />
}
