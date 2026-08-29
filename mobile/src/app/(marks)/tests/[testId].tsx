import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FontFamily, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchTestRoster, bulkSaveTestMarksAction, type TestSummary, type TestRosterStudent } from '@/lib/tests/fetch';

export default function TestEntryScreen() {
  const { testId } = useLocalSearchParams<{ testId: string }>();
  const theme = useTheme();
  const [test, setTest] = useState<TestSummary | null>(null);
  const [roster, setRoster] = useState<TestRosterStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  function load() {
    fetchTestRoster(testId).then((result) => {
      if (!result.ok) { setError(result.error); return; }
      setTest(result.test);
      setRoster(result.roster);
      setScores(Object.fromEntries(result.roster.filter((s) => s.score !== null).map((s) => [s.id, String(s.score)])));
    });
  }

  useEffect(load, [testId]);

  function setScore(studentId: string, value: string) {
    if (!test) return;
    if (value !== '' && (!/^\d{1,4}$/.test(value) || Number(value) > test.maxScore)) return;
    setScores((prev) => ({ ...prev, [studentId]: value }));
    setStatus('idle');
  }

  const enteredCount = (roster ?? []).filter((s) => scores[s.id] !== undefined && scores[s.id] !== '').length;

  async function handleSave() {
    if (!roster) return;
    setStatus('saving');
    setSaveError('');
    const entries = roster
      .filter((s) => scores[s.id] !== undefined && scores[s.id] !== '')
      .map((s) => ({ studentId: s.id, studentName: s.fullName, score: Number(scores[s.id]) }));

    const outcome = await bulkSaveTestMarksAction(testId, entries);
    if (!outcome.ok) {
      setSaveError(outcome.error);
      setStatus('error');
      return;
    }
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 3000);
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState message={error} onRetry={load} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!test || !roster) {
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
          <ScreenHeader title={test.title} subtitle={`${test.subjectName} · Grade ${test.gradeLevel}-${test.section}`} onBack={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {status === 'error' && (
            <View style={[styles.errorBanner, { backgroundColor: Semantic.dangerBg }]}>
              <AlertCircle size={14} color={Semantic.danger} />
              <ThemedText variant="small" style={{ color: Semantic.danger, flex: 1 }}>{saveError}</ThemedText>
            </View>
          )}

          <View style={styles.listHeader}>
            <ThemedText variant="small" color="textMuted">{enteredCount} of {roster.length} scores entered</ThemedText>
            <Button
              label={status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save All'}
              variant={status === 'saved' ? 'secondary' : 'primary'}
              loading={status === 'saving'}
              disabled={enteredCount === 0}
              onPress={handleSave}
              size="sm"
            />
          </View>

          <Card style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
            {roster.length === 0 ? (
              <ThemedText color="textSecondary" style={{ padding: Spacing.four, textAlign: 'center' }}>
                No students to grade — an elected subject only shows students actually enrolled in it.
              </ThemedText>
            ) : (
              roster.map((s, i) => (
                <View key={s.id} style={[styles.studentRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                  <Avatar name={s.fullName} size={32} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="small" numberOfLines={1}>{s.fullName}</ThemedText>
                    <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{s.rollNumber}</ThemedText>
                  </View>
                  <TextInput
                    value={scores[s.id] ?? ''}
                    onChangeText={(v) => setScore(s.id, v)}
                    placeholder="—"
                    keyboardType="number-pad"
                    style={[styles.scoreInput, { borderColor: theme.border, color: theme.text, fontFamily: FontFamily.mono }]}
                    placeholderTextColor={theme.textMuted}
                  />
                  <ThemedText variant="mono" color="textMuted" style={{ fontSize: 12 }}>/ {test.maxScore}</ThemedText>
                </View>
              ))
            )}
          </Card>
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
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.md, padding: 12 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 10, paddingHorizontal: Spacing.three },
  scoreInput: { width: 48, textAlign: 'center', borderWidth: 1, borderRadius: Radius.sm, paddingVertical: 6, fontSize: 13 },
});
