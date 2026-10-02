import ParentNotificationsContent from '@/components/dashboard/modules/ParentNotificationsContent'
import { fetchMyNotifications } from '@/lib/notifications/inbox'

export default async function ParentNotificationsPage() {
  const notifications = await fetchMyNotifications()
  return <ParentNotificationsContent notifications={notifications} />
}
