import { notFound } from 'next/navigation'
import { AdminMeetingDetail } from '@/components/dashboard/meetings/AdminMeetings'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function MeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) notFound()
  return <AdminMeetingDetail basePath="/admissions/meetings" id={id} />
}
