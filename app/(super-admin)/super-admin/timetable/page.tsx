import SuperAdminTimetableContent from '@/components/dashboard/modules/SuperAdminTimetableContent'
import { fetchTeachers } from '@/lib/teachers/fetch'

export default async function SuperAdminTimetablePage() {
  const teachers = await fetchTeachers()
  return <SuperAdminTimetableContent initialTeachers={teachers} />
}
