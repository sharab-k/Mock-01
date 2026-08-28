import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlertTriangle, ChevronRight } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { useAsyncData } from '@/lib/use-async-data';
import { fetchAttendanceDashboardData } from '@/lib/attendance/dashboard-data';
import { GRADES, sectionsForGrade } from '@/lib/students/constants';

export default function AttendanceDashboard() {
  const theme = useTheme();
  const { profile, signOut } = useAuth();
  const state = useAsyncData(fetchAttendanceDashboardData, []);

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
              <ThemedText variant="title">Attendance</ThemedText>
              <ThemedText variant="small" color="textSecondary">{data.todayLabel}</ThemedText>
            </View>
            <Pressable onPress={signOut} hitSlop={8}>
              <ThemedText variant="small" style={{ color: theme.accent }}>Log out</ThemedText>
            </Pressable>
          </View>
          {profile && (
            <ThemedText variant="small" color="textMuted" style={{ marginTop: -Spacing.two }}>
              Signed in as {profile.fullName}
            </ThemedText>
          )}

          {data.failedAlertsToday > 0 && (
            <Card style={[styles.alertCard, { backgroundColor: Semantic.dangerBg, borderColor: 'transparent' }]}>
              <AlertTriangle size={16} color={Semantic.danger} />
              <ThemedText variant="small" style={{ color: Semantic.danger, flex: 1 }}>
                {data.failedAlertsToday} absence alert{data.failedAlertsToday === 1 ? '' : 's'} failed to send today — call these parents directly.
              </ThemedText>
            </Card>
          )}

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">This week</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
              {data.week.map((day) => (
                <Card key={day.date} style={[styles.dayCard, day.isToday && { borderColor: theme.accent, borderWidth: 1.5 }]}>
                  <ThemedText variant="small" color="textSecondary">{day.day}</ThemedText>
                  <ThemedText variant="mono" style={{ fontSize: 12 }}>{day.date}</ThemedText>
                  <View style={styles.dayCounts}>
                    <ThemedText variant="small" style={{ color: Semantic.success }}>{day.present}</ThemedText>
                    <ThemedText variant="small" style={{ color: Semantic.danger }}>{day.absent}</ThemedText>
                    <ThemedText variant="small" style={{ color: Semantic.warning }}>{day.late}</ThemedText>
                  </View>
                </Card>
              ))}
            </ScrollView>
            <ThemedText variant="small" color="textMuted">Last week&apos;s average: {data.lastWeekAvg}% present</ThemedText>
          </View>

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Class Timings &amp; Late Policy</ThemedText>
            <Card style={{ gap: Spacing.two }}>
              <View style={styles.timingRow}>
                <ThemedText variant="small" color="textSecondary" style={{ flex: 1 }}>Class IX &amp; X — Girls</ThemedText>
                <ThemedText variant="mono" style={{ fontSize: 12 }}>4:00–6:30 PM</ThemedText>
              </View>
              <ThemedText variant="small" style={{ color: Semantic.warning }}>Late after 4:15 PM</ThemedText>
              <View style={[styles.timingRow, { marginTop: 4 }]}>
                <ThemedText variant="small" color="textSecondary" style={{ flex: 1 }}>Class IX &amp; X — Boys</ThemedText>
                <ThemedText variant="mono" style={{ fontSize: 12 }}>6:30–9:00 PM</ThemedText>
              </View>
              <ThemedText variant="small" style={{ color: Semantic.warning }}>Late after 6:45 PM</ThemedText>
              <View style={[styles.timingRow, { marginTop: 4 }]}>
                <ThemedText variant="small" color="textSecondary" style={{ flex: 1 }}>Class XI, XII &amp; ICOM</ThemedText>
                <ThemedText variant="mono" style={{ fontSize: 12 }}>Per schedule</ThemedText>
              </View>
              <ThemedText variant="small" style={{ color: Semantic.warning }}>Late 15 mins after class starts</ThemedText>
            </Card>
          </View>

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Classes</ThemedText>
            {GRADES.map((grade) => (
              <View key={grade} style={{ gap: 8 }}>
                <ThemedText variant="small" color="textMuted">Grade {grade}</ThemedText>
                {sectionsForGrade(grade).map((section) => {
                  const stat = data.classStats[grade]?.[section];
                  if (!stat || stat.total === 0) return null;
                  const unmarked = stat.total - stat.present - stat.absent - stat.late;
                  return (
                    <Pressable key={section} onPress={() => router.push(`/class/${grade}/${section}`)}>
                      <Card style={styles.classRow}>
                        <View style={{ flex: 1 }}>
                          <ThemedText variant="bodyMedium">Section {section}</ThemedText>
                          <ThemedText variant="small" color="textMuted">
                            {stat.present} present · {stat.absent} absent · {stat.late} late
                            {unmarked > 0 ? ` · ${unmarked} unmarked` : ''}
                          </ThemedText>
                        </View>
                        <ThemedText variant="mono" color="textSecondary">{stat.total}</ThemedText>
                        <ChevronRight size={16} color={theme.textMuted} />
                      </Card>
                    </Pressable>
                  );
                })}
              </View>
            ))}
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
  alertCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  // flexShrink: 0 — see lectures/index.tsx's filterChip comment; without it
  // React Native Web can still shrink a fixed-width row item below its set
  // width inside a horizontal ScrollView instead of scrolling.
  dayCard: { width: 76, alignItems: 'center', gap: 4, flexShrink: 0 },
  dayCounts: { flexDirection: 'row', gap: 6, marginTop: 4 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  timingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
