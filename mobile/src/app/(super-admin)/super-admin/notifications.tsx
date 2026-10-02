import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CalendarX, GraduationCap } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchSentNotifications, formatNotificationTime, type SentNotification } from '@/lib/notifications/inbox';

const FILTERS = ['All', 'Absence', 'Grade'] as const;

// Super Admin's view of everything delivered to any parent portal.
export default function SuperAdminNotificationsScreen() {
  const theme = useTheme();
  const [notifications, setNotifications] = useState<SentNotification[] | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');

  useEffect(() => {
    let mounted = true;
    fetchSentNotifications().then((data) => { if (mounted) setNotifications(data); });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (notifications ?? []).filter((n) =>
      (filter === 'All' || n.kind === filter.toLowerCase()) &&
      (!q || n.studentName.toLowerCase().includes(q) || n.parentName.toLowerCase().includes(q)),
    );
  }, [notifications, query, filter]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Sent Alerts"
          subtitle={notifications ? `Delivered to parent portals · ${filtered.length} of ${notifications.length}` : undefined}
          onBack={() => router.back()}
        />
        <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.two }}>
          <TextField label="Search" value={query} onChangeText={setQuery} placeholder="Student or parent name" />
          <ChipSelect options={FILTERS} value={filter} onChange={setFilter} />
        </View>

        {!notifications ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: Spacing.six }} />
        ) : (
          <ScrollView contentContainerStyle={styles.list}>
            {filtered.length === 0 ? (
              <ThemedText color="textMuted" style={{ textAlign: 'center', marginTop: Spacing.five }}>No notifications match.</ThemedText>
            ) : (
              filtered.map((n) => {
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
                        <ThemedText variant="small" color="textMuted">
                          To {n.parentName} · {n.studentName}{n.gradeLevel ? ` · Grade ${n.gradeLevel}-${n.section}` : ''}
                        </ThemedText>
                      </View>
                      <StatusPill tone={n.read ? 'success' : 'neutral'} label={n.read ? 'Read' : 'Unread'} />
                    </View>
                    <ThemedText variant="small" color="textMuted">{formatNotificationTime(n.createdAt)}</ThemedText>
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
});
