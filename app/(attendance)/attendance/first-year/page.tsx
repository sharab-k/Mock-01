import FirstYearAttendanceContent from '@/components/dashboard/modules/FirstYearAttendanceContent'
import { fetchSubjectRoster } from '@/lib/attendance/subject-roster'
import { resolveFirstYearSelection, type RawSelection } from '@/lib/attendance/first-year-selection'

export default async function FirstYearAttendancePage({ searchParams }: { searchParams: Promise<RawSelection> }) {
  const selection = resolveFirstYearSelection(await searchParams)
  const roster = selection.subject
    ? await fetchSubjectRoster({ section: selection.section, classDate: selection.classDate, subject: selection.subject, faculty: selection.faculty })
    : null

  // Keyed on the whole selection so the marks start fresh whenever it changes.
  const key = [selection.section, selection.classDate, selection.faculty, selection.subject].join('|')
  return <FirstYearAttendanceContent key={key} basePath="/attendance" selection={selection} roster={roster} />
}
