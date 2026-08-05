import SuperAdminTeachersContent from '@/components/dashboard/modules/SuperAdminTeachersContent'
import { fetchTeachers } from '@/lib/teachers/fetch'

export default async function SuperAdminTeachersPage() {
  const teachers = await fetchTeachers()
  return <SuperAdminTeachersContent initialTeachers={teachers} />
}
