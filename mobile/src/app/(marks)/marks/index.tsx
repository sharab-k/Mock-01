import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BookOpen, ClipboardCheck, ClipboardList, Layers } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { useAsyncData } from '@/lib/use-async-data';
import { fetchMarksDashboardData } from '@/lib/marks/dashboard-data';
import type { Tier } from '@/lib/marks/tier';

const TIER_TONE: Record<Tier, 'success' | 'ink' | 'warning' | 'danger'> = {
  Distinction: 'success', Merit: 'ink', Pass: 'warning', 'Below Pass': 'danger',
};

export default function MarksDashboard() {
  const theme = useTheme();
  const { profile, signOut } = useAuth();
  const state = useAsyncData(fetchMarksDashboardData, []);

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

  const data = state.data;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="title">Marks</ThemedText>
              {profile && <ThemedText variant="small" color="textSecondary">{profile.fullName}</ThemedText>}
            </View>
            <Pressable onPress={signOut} hitSlop={8}>
              <ThemedText variant="small" style={{ color: theme.accent }}>Log out</ThemedText>
            </Pressable>
          </View>

          <View style={styles.row}>
            <StatCard icon={ClipboardCheck} label="Students graded" value={String(data.studentsGraded)} />
            <StatCard icon={ClipboardList} label="Pending entry" value={String(data.pendingEntry)} />
          </View>
          <View style={styles.row}>
            <StatCard icon={Layers} label="Entries this week" value={String(data.entriesThisWeek)} />
            <StatCard icon={BookOpen} label="Subjects covered" value={String(data.subjectsCovered)} />
          </View>

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Tier distribution</ThemedText>
            <Card style={styles.tierRow}>
              {(Object.keys(data.tierCounts) as Tier[]).map((tier) => (
                <View key={tier} style={styles.tierItem}>
                  <ThemedText variant="title" style={{ fontSize: 20 }}>{data.tierCounts[tier]}</ThemedText>
                  <StatusPill tone={TIER_TONE[tier]} label={tier} />
                </View>
              ))}
            </Card>
          </View>

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Subjects</ThemedText>
            <Card style={{ gap: 12 }}>
              {data.subjects.length === 0 ? (
                <ThemedText color="textSecondary">No marks entered yet.</ThemedText>
              ) : (
                data.subjects.map((s) => (
                  <View key={s.name} style={styles.subjectRow}>
                    <ThemedText variant="small">{s.name}</ThemedText>
                    <ThemedText variant="small" color="textMuted">{s.entries} entries</ThemedText>
                    <ThemedText variant="mono" color="textSecondary">{s.avg}%</ThemedText>
                  </View>
                ))
              )}
            </Card>
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
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: Spacing.three },
  tierRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tierItem: { gap: 6, minWidth: '40%' },
  subjectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
