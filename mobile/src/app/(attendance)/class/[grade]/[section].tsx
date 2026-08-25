import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MessageSquareWarning } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchClassRoster, type RosterStudent } from '@/lib/attendance/class-roster';
import { lateCutoffLabel } from '@/lib/attendance/late-policy';

const STATUS_TONE = { unmarked: 'neutral', present: 'success', absent: 'danger', late: 'warning' } as const;

// Read-only — quick per-student status toggling stays on the Mark tab,
// which already covers the actual daily-marking workflow. This view is for
// the "one class roster view at a time" glance CLAUDE.md describes:
// today's status plus term-to-date attendance and alert delivery, at a
// class level.
export default function ClassDetailScreen() {
  const { grade, section } = useLocalSearchParams<{ grade: string; section: string }>();
  const theme = useTheme();
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchClassRoster(grade, section).then((result) => {
      if (!mounted) return;
      if (!result.ok) { setError(result.error); return; }
      setRoster(result.roster);
    });
    return () => { mounted = false; };
  }, [grade, section]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title={`Grade ${grade} · Section ${section}`} subtitle={`Today · Late: ${lateCutoffLabel(grade, section)}`} onBack={() => router.back()} />
        </View>

        {error && (
          <View style={styles.centered}>
            <ThemedText color="textSecondary">{error}</ThemedText>
          </View>
        )}

        {!error && !roster && (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.accent} />
          </View>
        )}

        {roster && (
          <ScrollView contentContainerStyle={styles.list}>
            {roster.length === 0 ? (
              <ThemedText color="textSecondary">No students in this class.</ThemedText>
            ) : (
              roster.map((s) => (
                <Card key={s.id} style={{ gap: 8 }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="small">{s.name}</ThemedText>
                      <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{s.roll}</ThemedText>
                    </View>
                    <StatusPill tone={STATUS_TONE[s.status]} label={s.status === 'unmarked' ? 'Unmarked' : undefined} />
                  </View>
                  <View style={styles.row}>
                    <ThemedText variant="small" color="textMuted">
                      Term: {s.termAttendance.present}P · {s.termAttendance.absent}A · {s.termAttendance.late}L / {s.termAttendance.total}
                    </ThemedText>
                    {s.alertStatus === 'failed' && (
                      <View style={styles.alertBadge}>
                        <MessageSquareWarning size={12} color={Semantic.danger} />
                        <ThemedText variant="small" style={{ color: Semantic.danger }}>Alert failed</ThemedText>
                      </View>
                    )}
                  </View>
                </Card>
              ))
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
