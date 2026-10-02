import MarksEnterContent from '@/components/dashboard/modules/MarksEnterContent'
import { fetchMarksEntryData } from '@/lib/marks/enter-data'
import { fetchSubjects } from '@/lib/actions/subjects'

export default async function SuperAdminEnterMarksPage() {
  const [{ roster, existingMarks }, subjects] = await Promise.all([fetchMarksEntryData(), fetchSubjects()])
  return <MarksEnterContent basePath="/super-admin/marks" roster={roster} existingMarks={existingMarks} subjects={subjects} />
}
