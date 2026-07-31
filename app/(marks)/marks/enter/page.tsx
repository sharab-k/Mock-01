import MarksEnterContent from '@/components/dashboard/modules/MarksEnterContent'
import { fetchMarksEntryData } from '@/lib/marks/enter-data'

export default async function EnterMarksPage() {
  const { roster, existingMarks } = await fetchMarksEntryData()
  return <MarksEnterContent basePath="/marks" roster={roster} existingMarks={existingMarks} />
}
