import MarksReportsContent from '@/components/dashboard/modules/MarksReportsContent'
import { fetchTieredStudents } from '@/lib/marks/reports-data'

export default async function MarksReportsPage() {
  const students = await fetchTieredStudents()
  return <MarksReportsContent basePath="/marks" students={students} />
}
