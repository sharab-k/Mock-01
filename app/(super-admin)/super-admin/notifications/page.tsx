import SuperAdminNotificationsContent from '@/components/dashboard/modules/SuperAdminNotificationsContent'
import { fetchSentNotifications } from '@/lib/notifications/inbox'

export default async function SuperAdminNotificationsPage() {
  const notifications = await fetchSentNotifications()
  return <SuperAdminNotificationsContent notifications={notifications} />
}
