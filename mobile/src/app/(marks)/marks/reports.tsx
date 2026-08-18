import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchTieredStudents, type TieredStudent } from '@/lib/marks/reports-data';
import { TIER_ORDER, type Tier } from '@/lib/marks/tier';

const TIER_TONE: Record<Tier, 'success' | 'ink' | 'warning' | 'danger'> = {
  Distinction: 'success', Merit: 'ink', Pass: 'warning', 'Below Pass': 'danger',
};

export default function MarksReportsScreen() {
  const theme = useTheme();
  const [students, setStudents] = useState<TieredStudent[] | null>(null);
  const [filter, setFilter] = useState<Tier | 'All'>('All');

  useEffect(() => {
    let mounted = true;
    fetchTieredStudents().then((data) => { if (mounted) setStudents(data); });
    return () => { mounted = false; };
  }, []);

  const tierCounts = useMemo(() => {
    const counts: Record<Tier, number> = { Distinction: 0, Merit: 0, Pass: 0, 'Below Pass': 0 };
    for (const s of students ?? []) counts[s.tier]++;
    return counts;
  }, [students]);

  const filtered = (students ?? []).filter((s) => filter === 'All' || s.tier === filter);

  if (!students) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText variant="title">Reports</ThemedText>
          <ThemedText variant="small" color="textSecondary">Tier evaluation — {students.length} graded students</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.tierGrid}>
            {TIER_ORDER.map((tier) => {
              const active = filter === tier;
              return (
                <Pressable
                  key={tier}
                  onPress={() => setFilter(active ? 'All' : tier)}
                  style={{ flexGrow: 1, minWidth: '45%' }}>
                  <Card style={[styles.tierCard, active && { borderColor: Ink[600], borderWidth: 1.5 }]}>
                    <ThemedText variant="title" style={{ fontSize: 22 }}>{tierCounts[tier]}</ThemedText>
                    <StatusPill tone={TIER_TONE[tier]} label={tier} />
                  </Card>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: Spacing.two }}>
            {filtered.length === 0 ? (
              <ThemedText color="textSecondary">No students in this tier.</ThemedText>
            ) : (
              filtered.map((s) => (
                <Card key={s.id} style={styles.studentRow}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="small">{s.full_name}</ThemedText>
                    <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>
                      {s.roll_number} · Grade {s.grade}-{s.section}
                    </ThemedText>
                  </View>
                  <ThemedText variant="mono" color="textSecondary">{s.average}%</ThemedText>
                  <StatusPill tone={TIER_TONE[s.tier]} label={s.tier} />
                </Card>
              ))
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
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.four, paddingBottom: Spacing.six },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tierCard: { gap: 6, borderRadius: Radius.lg },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
