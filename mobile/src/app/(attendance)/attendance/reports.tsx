import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchAttendanceReportsData, type AttendanceReportsData } from '@/lib/attendance/reports-data';

export default function AttendanceReportsScreen() {
  const theme = useTheme();
  const [data, setData] = useState<AttendanceReportsData | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchAttendanceReportsData().then((d) => { if (mounted) setData(d); });
    return () => { mounted = false; };
  }, []);

  if (!data) {
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
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText variant="title">Reports</ThemedText>

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Monthly trend</ThemedText>
            <Card style={{ gap: 14 }}>
              {data.monthTrend.map((w) => (
                <View key={w.week} style={{ gap: 6 }}>
                  <View style={styles.barLabelRow}>
                    <ThemedText variant="small" color="textSecondary">{w.week}</ThemedText>
                    <ThemedText variant="mono" color="textSecondary">{w.rate}%</ThemedText>
                  </View>
                  <ProgressBar pct={w.rate} />
                </View>
              ))}
            </Card>
          </View>

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">By grade</ThemedText>
            <Card style={{ gap: 14 }}>
              {Object.entries(data.classComparison).map(([grade, rate]) => (
                <View key={grade} style={{ gap: 6 }}>
                  <View style={styles.barLabelRow}>
                    <ThemedText variant="small" color="textSecondary">
                      Grade {grade} <ThemedText variant="small" color="textMuted">· {data.classTotals[grade] ?? 0} students</ThemedText>
                    </ThemedText>
                    <ThemedText variant="mono" color="textSecondary">{rate}%</ThemedText>
                  </View>
                  <ProgressBar pct={rate} />
                </View>
              ))}
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
  barLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
