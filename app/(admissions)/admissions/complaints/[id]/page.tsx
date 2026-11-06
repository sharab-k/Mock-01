import { notFound } from 'next/navigation'
import { AdminComplaintDetail } from '@/components/dashboard/complaints/AdminComplaints'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ComplaintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  return <AdminComplaintDetail basePath="/admissions/complaints" id={id} />
}
