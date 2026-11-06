import { redirect } from 'next/navigation'
import AttendanceClassDetailContent from '@/components/dashboard/modules/AttendanceClassDetailContent'
import { YEAR_SLUG, isSubjectGrade } from '@/lib/attendance/first-year-subjects'
import { fetchClassRoster } from '@/lib/attendance/roster'
import { resolveClassDate } from '@/lib/attendance/class-date'
import { GRADES, sectionsForGrade, type Grade, type Section } from '@/lib/students/constants'

export default async function ClassRosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ grade: string; section: string }>
  searchParams: Promise<{ date?: string }>
}) {
  const { grade, section } = await params
  // First Year attends by faculty and subject, never for a whole day.
  if (isSubjectGrade(grade)) redirect(`/attendance/${YEAR_SLUG[grade]}?section=${encodeURIComponent(section)}`)
  const classDate = resolveClassDate((await searchParams).date)
  const isValid = GRADES.includes(grade as Grade) && sectionsForGrade(grade as Grade).includes(section as Section)
  const students = isValid ? await fetchClassRoster(grade, section, undefined, classDate) : []

  return <AttendanceClassDetailContent key={classDate} classDate={classDate} grade={grade} section={section} basePath="/attendance" students={students} />
}
