import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { PlayCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchStudentLectures, type LectureProgress } from '@/lib/student/lectures';
import { useLinkedChild } from '@/lib/parent/use-linked-child';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function LecturesListScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const theme = useTheme();
  const childState = useLinkedChild(studentId);
  const [lectures, setLectures] = useState<LectureProgress[] | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');

  useEffect(() => {
    let mounted = true;
    fetchStudentLectures(studentId).then((data) => { if (mounted) setLectures(data); });
    return () => { mounted = false; };
  }, [studentId]);

  const subjects = useMemo(
    () => ['All Subjects', ...Array.from(new Set((lectures ?? []).map((l) => l.subject)))],
    [lectures],
  );
  const filtered = (lectures ?? []).filter((l) => subjectFilter === 'All Subjects' || l.subject === subjectFilter);

  if (!lectures || childState.status !== 'ready') {
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
            <ThemedText color="textSecondary">No lectures match this filter.</ThemedText>
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
                  })}>
                  <Card style={styles.lectureRow}>
                    <View style={[styles.iconWrap, { backgroundColor: l.completed ? Semantic.successBg : Ink[50] }]}>
                      <PlayCircle size={18} color={l.completed ? Semantic.success : Ink[600]} />
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
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  filterRow: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three },
  filterChip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12 },
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  lectureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
