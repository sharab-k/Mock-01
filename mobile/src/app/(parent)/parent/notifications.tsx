import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bell, CalendarX, GraduationCap } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchMyNotifications, formatNotificationTime, markAllNotificationsRead, type InboxNotification } from '@/lib/notifications/inbox';

// The parent's in-app inbox — every absence alert and new result the school
// sends lands here, independent of whether WhatsApp/SMS got through.
export default function ParentNotificationsScreen() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<InboxNotification[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchMyNotifications().then((data) => {
      if (!mounted) return;
      setNotifications(data);
      // "New" pills reflect what was unread on open; the server copy is
      // marked read right after, so they clear on the next visit.
      if (data.some((n) => !n.read)) void markAllNotificationsRead();
    });
    return () => { mounted = false; };
  }, []);

  const newCount = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Notifications"
          subtitle={!notifications ? undefined : notifications.length === 0 ? 'Nothing yet' : `${notifications.length} from the school${newCount > 0 ? ` · ${newCount} new` : ''}`}
          onBack={() => router.back()}
        />
        {!notifications ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: Spacing.six }} />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {notifications.length === 0 ? (
              <View style={styles.empty}>
                <Bell size={26} color={theme.textMuted} />
                <ThemedText color="textMuted" style={{ textAlign: 'center' }}>Absence alerts and new results will appear here.</ThemedText>
              </View>
            ) : (
              notifications.map((n) => {
                const absence = n.kind === 'absence';
                const Icon = absence ? CalendarX : GraduationCap;
                return (
                  <Card key={n.id} style={{ gap: Spacing.two }}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.iconBox, { backgroundColor: absence ? Semantic.dangerBg : Ink[100] }]}>
                        <Icon size={15} color={absence ? Semantic.danger : Ink[700]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText variant="bodyMedium">{n.title}</ThemedText>
                        <ThemedText variant="small" color="textMuted">{n.studentName} · {formatNotificationTime(n.createdAt)}</ThemedText>
                      </View>
                      {!n.read && <StatusPill tone="ink" label="New" />}
                    </View>
                    <ThemedText variant="small" color="textSecondary" style={{ lineHeight: 20 }}>{n.body}</ThemedText>
                  </Card>
                );
              })
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconBox: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
});
