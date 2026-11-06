import FirstYearAttendanceContent from '@/components/dashboard/modules/FirstYearAttendanceContent'
import { fetchSubjectRoster } from '@/lib/attendance/subject-roster'
import { resolveFirstYearSelection, type RawSelection } from '@/lib/attendance/first-year-selection'

export default async function SuperAdminFirstYearAttendancePage({ searchParams }: { searchParams: Promise<RawSelection> }) {
  const selection = resolveFirstYearSelection(await searchParams)
  const roster = selection.subject
    ? await fetchSubjectRoster({ section: selection.section, classDate: selection.classDate, subject: selection.subject, faculty: selection.faculty })
    : null

  const key = [selection.section, selection.classDate, selection.faculty, selection.subject].join('|')
  return <FirstYearAttendanceContent key={key} basePath="/super-admin/attendance" selection={selection} roster={roster} />
}
