import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';

import { useAuth } from '@/lib/auth/auth-context';
import { clearAsyncCache } from '@/lib/use-async-data';
import { registerForPush } from '@/lib/notifications/push';

const INBOX = '/parent/notifications' as Href;

// Mounted once in the root layout (inside AuthProvider). For a signed-in parent
// it registers this phone for push, and it opens the notification inbox when a
// push is tapped — including the tap that launched the app from closed.
export function PushNotificationsHost() {
  const { role, session, loading } = useAuth();
  const ready = !loading && role === 'parent' && !!session;
  const handledLaunch = useRef(false);

  useEffect(() => {
    if (!ready) return;
    void registerForPush();
  }, [ready, session?.user.id]);

  useEffect(() => {
    if (!ready) return;

    const open = () => {
      clearAsyncCache(); // the inbox and unread badge must not show stale copies
      router.push(INBOX);
    };

    if (!handledLaunch.current) {
      handledLaunch.current = true;
      const last = Notifications.getLastNotificationResponse();
      if (last && last.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) open();
    }

    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) open();
    });
    return () => sub.remove();
  }, [ready]);

  return null;
}
