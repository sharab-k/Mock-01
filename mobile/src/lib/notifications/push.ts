import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase/client';

// Phone push notifications for parents. Notices are created in the database
// (absence trigger, grade notices); the web app pushes them to the phones
// registered here — see supabase/migrations/20261026140000_push_notifications.sql
// and app/api/push/notify/route.ts. The in-app inbox (inbox.ts) remains the
// record; push is only the "tap on the shoulder".

const TOKEN_KEY = 'je-push-token';
// Android shows a push only when its channel exists; the server sends to this id.
export const PUSH_CHANNEL = 'default';

// Show a push as a banner + in the notification list even while the app is open.
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export type RegisterResult = { ok: true; token: string } | { ok: false; reason: 'unsupported' | 'denied' | 'no_project' | 'failed' };

// Asks for permission (the first time only), gets this phone's Expo push token
// and saves it against the signed-in parent. Safe to call on every launch.
export async function registerForPush(): Promise<RegisterResult> {
  if (Platform.OS === 'web') return { ok: false, reason: 'unsupported' };
  try {
    // Android 13+ shows the permission prompt only once a channel exists.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL, {
        name: 'School notices',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#233357',
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.status === 'granted';
    if (!granted && existing.canAskAgain) {
      granted = (await Notifications.requestPermissionsAsync()).status === 'granted';
    }
    if (!granted) return { ok: false, reason: 'denied' };

    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return { ok: false, reason: 'no_project' };

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: Platform.OS });
    if (error) return { ok: false, reason: 'failed' };

    await SecureStore.setItemAsync(TOKEN_KEY, token);
    return { ok: true, token };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

// Called on sign-out, while the session still exists: this phone stops getting
// the signed-out parent's notices (e.g. a phone handed to someone else).
export async function unregisterPush(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return;
    await supabase.rpc('unregister_push_token', { p_token: token });
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // Signing out must never fail because of this; the server also drops dead tokens.
  }
}
