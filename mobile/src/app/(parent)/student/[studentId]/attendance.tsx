import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchAttendanceHistory, type AttendanceMonth } from '@/lib/student/attendance-history';

const STATUS_COLOR: Record<'Present' | 'Late' | 'Absent', string> = {
  Present: Semantic.success,
  Late: Semantic.warning,
  Absent: Semantic.danger,
};

export default function StudentAttendanceScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const theme = useTheme();
  const [months, setMonths] = useState<AttendanceMonth[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchAttendanceHistory(studentId).then((data) => { if (mounted) setMonths(data); });
    return () => { mounted = false; };
  }, [studentId]);

  if (!months) {
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
          <ThemedText variant="title">Attendance</ThemedText>

          {months.length === 0 ? (
            <ThemedText color="textSecondary">No attendance recorded yet.</ThemedText>
          ) : (
            [...months].reverse().map((month) => (
              <Card key={`${month.year}-${month.monthIndex}`} style={{ gap: 10 }}>
                <ThemedText variant="bodyMedium">{month.label} {month.year}</ThemedText>
                <View style={styles.grid}>
                  {month.days.map((day) => (
                    <View key={day.date} style={[styles.dayChip, { backgroundColor: theme.surfaceElement }]}>
                      <ThemedText variant="mono" style={{ fontSize: 12 }}>{day.date}</ThemedText>
                      <View style={[styles.dot, { backgroundColor: STATUS_COLOR[day.status] }]} />
                    </View>
                  ))}
                </View>
              </Card>
            ))
          )}
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});
