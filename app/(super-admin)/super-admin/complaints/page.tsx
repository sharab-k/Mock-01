import { AdminComplaintsList } from '@/components/dashboard/complaints/AdminComplaints'

type Props = { searchParams: Promise<{ status?: string; from?: string; to?: string; q?: string }> }

export default async function ComplaintsPage({ searchParams }: Props) {
  return <AdminComplaintsList basePath="/super-admin/complaints" searchParams={await searchParams} />
}
