import SuperAdminSubjectsContent from '@/components/dashboard/modules/SuperAdminSubjectsContent'
import { fetchSubjects } from '@/lib/actions/subjects'

export default async function SuperAdminSubjectsPage() {
  const subjects = await fetchSubjects()
  return <SuperAdminSubjectsContent initialSubjects={subjects} />
}
