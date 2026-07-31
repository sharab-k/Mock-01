import MarksSubjectsContent from '@/components/dashboard/modules/MarksSubjectsContent'
import { fetchSubjectStats } from '@/lib/marks/subjects-data'

export default async function MarksSubjectsPage() {
  const subjects = await fetchSubjectStats()
  return <MarksSubjectsContent initialSubjects={subjects} />
}
