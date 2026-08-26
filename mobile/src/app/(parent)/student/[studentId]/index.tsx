import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { BookOpen, CalendarCheck } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchStudentDashboardData } from '@/lib/student/dashboard-data';
import { useAsyncData } from '@/lib/use-async-data';
import { useLinkedChild } from '@/lib/parent/use-linked-child';
import { downloadProgressReport } from '@/lib/reports/download';

const TIER_TONE = { Distinction: 'success', Merit: 'ink', Pass: 'warning', 'Below Pass': 'danger' } as const;
const STATUS_TONE = { Present: 'success', Late: 'warning', Absent: 'danger' } as const;

export default function StudentOverview() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const theme = useTheme();
  const childState = useLinkedChild(studentId);
  const dataState = useAsyncData(() => fetchStudentDashboardData(studentId), [studentId]);

  const [downloading, setDownloading] = useState(false);

  if (childState.status === 'error') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState message={childState.error} onRetry={childState.reload} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (dataState.status === 'error') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState message={dataState.error} onRetry={dataState.reload} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (dataState.status !== 'ready' || childState.status !== 'ready') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const data = dataState.data;
  const child = childState.child;

  async function handleDownload() {
    setDownloading(true);
    const result = await downloadProgressReport(child.id, child.fullName);
    setDownloading(false);
    if (!result.ok) Alert.alert('Could not download report', result.error);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <ThemedText variant="title">{child.fullName}</ThemedText>
            <ThemedText variant="mono" color="textSecondary">
              {child.rollNumber} · Grade {child.gradeLevel}-{child.section}
            </ThemedText>
            {child.isLateEnrollment && (
              <View style={{ marginTop: Spacing.two, alignSelf: 'flex-start' }}>
                <StatusPill tone="warning" label="Late enrollment — strict video tracking" />
              </View>
            )}
          </View>

          <View style={styles.row}>
            <StatCard icon={CalendarCheck} label="Attendance" value={`${data.attendancePct}%`} />
            <StatCard icon={BookOpen} label="Average score" value={`${data.avgScore}%`} />
          </View>

          {data.tier && (
            <Card style={styles.tierRow}>
              <ThemedText variant="bodyMedium">Current tier</ThemedText>
              <StatusPill tone={TIER_TONE[data.tier]} label={data.tier} />
            </Card>
          )}

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Recent attendance</ThemedText>
            <Card style={{ gap: 10 }}>
              {data.attendance.length === 0 ? (
                <ThemedText color="textSecondary">No attendance recorded yet.</ThemedText>
              ) : (
                data.attendance.map((a, i) => (
                  <View key={i} style={styles.listRow}>
                    <ThemedText variant="small" color="textSecondary" style={{ width: 90 }}>{a.day}, {a.date}</ThemedText>
                    <StatusPill tone={STATUS_TONE[a.status]} label={a.status} />
                  </View>
                ))
              )}
            </Card>
          </View>

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Recent marks</ThemedText>
            <Card style={{ gap: 10 }}>
              {data.marks.length === 0 ? (
                <ThemedText color="textSecondary">No marks recorded yet.</ThemedText>
              ) : (
                data.marks.slice(0, 5).map((m, i) => (
                  <View key={i} style={styles.listRow}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="small">{m.subject}</ThemedText>
                      <ThemedText variant="small" color="textMuted">{m.exam}</ThemedText>
                    </View>
                    <ThemedText variant="mono" color="textSecondary">{m.score}/{m.max}</ThemedText>
                    <StatusPill tone="ink" label={m.grade} />
                  </View>
                ))
              )}
            </Card>
          </View>

          <Button
            label={downloading ? 'Preparing report…' : 'Download progress report'}
            variant="secondary"
            loading={downloading}
            onPress={handleDownload}
          />
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
  row: { flexDirection: 'row', gap: Spacing.three },
  tierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
