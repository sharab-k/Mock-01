import SubjectsContent from '@/components/dashboard/modules/SuperAdminSubjectsContent'
import { fetchSubjects } from '@/lib/actions/subjects'

// Marks Admin manages each grade's subject list directly (add/remove) —
// enrollment into elected subjects stays Super Admin-only.
export default async function MarksSubjectsPage() {
  const subjects = await fetchSubjects()
  return <SubjectsContent initialSubjects={subjects} basePath="/marks" backLabel="Marks" canEnroll={false} />
}
