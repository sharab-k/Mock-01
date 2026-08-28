import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PlayCircle } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Semantic, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchStudentLectures } from '@/lib/student/lectures';
import { useAsyncData } from '@/lib/use-async-data';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LecturesListScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const theme = useTheme();
  const lecturesState = useAsyncData(() => fetchStudentLectures(studentId), [studentId]);
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');

  const lectures = lecturesState.status === 'ready' ? lecturesState.data : null;
  const subjects = useMemo(
    () => ['All Subjects', ...Array.from(new Set((lectures ?? []).map((l) => l.subject)))],
    [lectures],
  );
  const filtered = (lectures ?? []).filter((l) => subjectFilter === 'All Subjects' || l.subject === subjectFilter);

  if (lecturesState.status === 'error') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState message={lecturesState.error} onRetry={lecturesState.reload} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!lectures) {
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
          <ThemedText variant="title">Video Lectures</ThemedText>
          <ThemedText variant="small" color="textSecondary">{lectures.length} lectures available this term</ThemedText>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {subjects.map((s) => {
            const active = s === subjectFilter;
            return (
              <Pressable
                key={s}
                onPress={() => setSubjectFilter(s)}
                style={[styles.filterChip, { borderColor: active ? Ink[600] : theme.border, backgroundColor: active ? Ink[50] : theme.surface }]}>
                <ThemedText variant="small" style={active ? { color: Ink[700] } : undefined}>{s}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.content}>
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconWrap, { backgroundColor: theme.surfaceElement }]}>
                <PlayCircle size={22} color={theme.textMuted} />
              </View>
              <ThemedText color="textSecondary" style={{ textAlign: 'center' }}>No lectures match this filter.</ThemedText>
            </View>
          ) : (
            filtered.map((l) => {
              const pct = Math.round((l.watchedSeconds / l.durationSeconds) * 100);
              return (
                <Pressable
                  key={l.id}
                  onPress={() => router.push({
                    pathname: '/student/[studentId]/lectures/[lectureId]',
                    params: {
                      studentId,
                      lectureId: l.id,
                      title: l.title,
                      subject: l.subject,
                      durationSeconds: String(l.durationSeconds),
                      watchedSeconds: String(l.watchedSeconds),
                      completed: String(l.completed),
                    },
                  })}
                  style={({ pressed }) => [pressed && styles.pressed]}>
                  <Card style={[styles.lectureRow, Shadow[2]]}>
                    <View style={[styles.iconWrap, { backgroundColor: l.completed ? Semantic.successBg : Ink[50] }]}>
                      <PlayCircle size={20} color={l.completed ? Semantic.success : Ink[600]} />
                    </View>
                    <View style={{ flex: 1, gap: 4 }}>
                      <ThemedText variant="bodyMedium" numberOfLines={1}>{l.title}</ThemedText>
                      <ThemedText variant="small" color="textMuted">{l.subject} · {fmt(l.durationSeconds)}</ThemedText>
                      {!l.completed && pct > 0 && <ProgressBar pct={pct} tone="warning" />}
                    </View>
                    <StatusPill tone={l.completed ? 'success' : pct > 0 ? 'warning' : 'neutral'} label={l.completed ? 'Watched' : pct > 0 ? `${pct}%` : 'New'} />
                  </Card>
                </Pressable>
              );
            })
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
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: 2 },
  filterRow: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  filterChip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 14 },
  content: { padding: Spacing.four, paddingTop: Spacing.one, gap: Spacing.three, paddingBottom: Spacing.six },
  lectureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 4 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingVertical: Spacing.six },
  emptyIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
