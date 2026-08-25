import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CalendarCheck, ChevronRight, TrendingUp } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NoticeCard } from '@/components/notice-card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { useAsyncData } from '@/lib/use-async-data';
import { fetchParentChildren, type ParentChild } from '@/lib/parent/dashboard-data';
import { fetchVisibleNotices } from '@/lib/notices/fetch';
import type { Notice } from '@/lib/notices/types';
import { downloadProgressReport } from '@/lib/reports/download';

const TIER_TONE = { Distinction: 'success', Merit: 'ink', Pass: 'warning', 'Below Pass': 'danger' } as const;

async function loadDashboard(): Promise<{ children: ParentChild[]; notices: Notice[] }> {
  const [kids, allNotices] = await Promise.all([fetchParentChildren(), fetchVisibleNotices()]);
  // Parent's own dashboard wants the All/Parents subset — the
  // Students-audience notices show on the student-view notices screen.
  const notices = allNotices.filter((n) => n.audience === 'All' || n.audience === 'Parents');
  return { children: kids, notices };
}

export default function ParentDashboard() {
  const theme = useTheme();
  const { profile, signOut } = useAuth();

  const state = useAsyncData(loadDashboard, []);
  // Explicit override only — starts null and falls back to the first child
  // below, so switching siblings doesn't need an effect to sync state.
  const [explicitSelectedId, setExplicitSelectedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'error') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState message={state.error} onRetry={state.reload} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { children, notices } = state.data;
  const selectedId = explicitSelectedId ?? children[0]?.id ?? null;
  const selected = children.find((c) => c.id === selectedId) ?? null;

  async function handleDownload() {
    if (!selected) return;
    setDownloading(true);
    const result = await downloadProgressReport(selected.id, selected.name);
    setDownloading(false);
    if (!result.ok) {
      Alert.alert('Could not download report', result.error);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <Avatar name={profile?.fullName ?? 'Parent'} size={44} />
            <View style={{ flex: 1 }}>
              <ThemedText variant="bodyMedium">{profile?.fullName ?? 'Parent'}</ThemedText>
              <ThemedText variant="small" color="textSecondary">{profile?.email}</ThemedText>
            </View>
            <Pressable onPress={signOut} hitSlop={8}>
              <ThemedText variant="small" style={{ color: theme.accent }}>Log out</ThemedText>
            </Pressable>
          </View>

          {children.length === 0 && (
            <Card>
              <ThemedText color="textSecondary">No children are linked to this account yet.</ThemedText>
            </Card>
          )}

          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
              {children.map((child) => {
                const active = child.id === selectedId;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => setExplicitSelectedId(child.id)}
                    style={[
                      styles.chip,
                      { borderColor: active ? Ink[600] : theme.border, backgroundColor: active ? Ink[50] : theme.surface },
                    ]}>
                    <Avatar name={child.name} size={22} />
                    <ThemedText variant="small" style={active ? { color: Ink[700] } : undefined}>{child.name}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {selected && (
            <>
              <Pressable onPress={() => router.push(`/student/${selected.id}`)}>
                <Card style={styles.selectedCard}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="subtitle">{selected.name}</ThemedText>
                    <ThemedText variant="mono" color="textSecondary">
                      {selected.roll} · Grade {selected.grade}-{selected.section}
                    </ThemedText>
                  </View>
                  {selected.tier && <StatusPill tone={TIER_TONE[selected.tier]} label={selected.tier} />}
                  <ChevronRight size={18} color={theme.textMuted} />
                </Card>
              </Pressable>

              <StatusPill
                tone={selected.feeStatus === 'paid' ? 'success' : 'danger'}
                label={selected.feeStatus === 'paid' ? "This month's fee: Paid" : "This month's fee: Unpaid"}
              />

              <View style={styles.row}>
                <StatCard icon={CalendarCheck} label="Attendance" value={`${selected.attendancePct}%`} />
                <StatCard icon={TrendingUp} label="Average score" value={`${selected.avgScore}%`} />
              </View>

              <Button
                label={downloading ? 'Preparing report…' : 'Download progress report'}
                variant="secondary"
                loading={downloading}
                onPress={handleDownload}
              />
            </>
          )}

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Notices</ThemedText>
            {notices.length === 0 ? (
              <ThemedText color="textSecondary">No notices right now.</ThemedText>
            ) : (
              notices.map((n) => <NoticeCard key={n.id} notice={n} />)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switcher: { gap: Spacing.two, paddingRight: Spacing.four },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  selectedCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.three },
});
