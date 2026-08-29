import MarksTestsContent from '@/components/dashboard/modules/MarksTestsContent'
import { fetchTests } from '@/lib/actions/tests'
import { fetchSubjects } from '@/lib/actions/subjects'

export default async function SuperAdminMarksTestsPage() {
  const [tests, subjects] = await Promise.all([fetchTests(), fetchSubjects()])
  return <MarksTestsContent basePath="/super-admin/marks" initialTests={tests} subjects={subjects} />
}
