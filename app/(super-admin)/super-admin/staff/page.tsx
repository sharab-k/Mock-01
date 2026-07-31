import SuperAdminStaffContent from '@/components/dashboard/modules/SuperAdminStaffContent'
import { fetchStaffDirectory } from '@/lib/staff/fetch'

export default async function SuperAdminStaffPage() {
  const staff = await fetchStaffDirectory()
  return <SuperAdminStaffContent initialStaff={staff} />
}
