import MarksReportsContent from '@/components/dashboard/modules/MarksReportsContent'
import { fetchTieredStudents } from '@/lib/marks/reports-data'

export default async function SuperAdminMarksReportsPage() {
  const students = await fetchTieredStudents()
  return <MarksReportsContent basePath="/super-admin/marks" students={students} />
}
