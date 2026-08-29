import MarksTestsContent from '@/components/dashboard/modules/MarksTestsContent'
import { fetchTests } from '@/lib/actions/tests'
import { fetchSubjects } from '@/lib/actions/subjects'

export default async function MarksTestsPage() {
  const [tests, subjects] = await Promise.all([fetchTests(), fetchSubjects()])
  return <MarksTestsContent initialTests={tests} subjects={subjects} />
}
