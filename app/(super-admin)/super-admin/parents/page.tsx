import SuperAdminParentDirectoryContent from '@/components/dashboard/modules/SuperAdminParentDirectoryContent'
import { fetchParentDirectory } from '@/lib/admissions/parent-lookup'

export default async function SuperAdminParentsPage() {
  const parents = await fetchParentDirectory()
  return <SuperAdminParentDirectoryContent parents={parents} />
}
