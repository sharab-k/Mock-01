import MarksEnterContent from '@/components/dashboard/modules/MarksEnterContent'
import { fetchMarksEntryData } from '@/lib/marks/enter-data'

export default async function SuperAdminEnterMarksPage() {
  const { roster, existingMarks } = await fetchMarksEntryData()
  return <MarksEnterContent basePath="/super-admin/marks" roster={roster} existingMarks={existingMarks} />
}
