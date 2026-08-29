import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { ClipboardList, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { Ink, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GRADES, sectionsForGrade, type Grade, type Section } from '@/lib/students/constants';
import { fetchSubjects, type Subject } from '@/lib/subjects/fetch';
import { fetchTests, createTestAction, type TestSummary } from '@/lib/tests/fetch';

export default function MarksTestsScreen() {
  const theme = useTheme();
  const [tests, setTests] = useState<TestSummary[] | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [creating, setCreating] = useState(false);
  const [grade, setGrade] = useState<Grade>(GRADES[0]);
  const [section, setSection] = useState<Section>(sectionsForGrade(GRADES[0])[0]);
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    Promise.all([fetchTests(), fetchSubjects()]).then(([t, s]) => {
      setTests(t);
      setSubjects(s);
    });
  }

  useEffect(load, []);

  const subjectsForGrade = useMemo(() => subjects.filter((s) => s.gradeLevel === grade), [subjects, grade]);

  function openCreate() {
    setGrade(GRADES[0]);
    setSection(sectionsForGrade(GRADES[0])[0]);
    setSubjectId('');
    setTitle('');
    setMaxScore('100');
    setError('');
    setCreating(true);
  }

  function changeGrade(g: Grade) {
    setGrade(g);
    setSection(sectionsForGrade(g)[0]);
    setSubjectId('');
  }

  async function handleCreate() {
    if (!subjectId || !title.trim()) return;
    setSaving(true);
    setError('');
    const outcome = await createTestAction({
      subjectId, gradeLevel: grade, section, title: title.trim(),
      maxScore: Number(maxScore) || 100, testDate: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    if (!outcome.ok) { setError(outcome.error); return; }
    setCreating(false);
    load();
  }

  if (!tests) {
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
          <View style={{ flex: 1 }}>
            <ThemedText variant="title" style={{ fontSize: 20, lineHeight: 26 }}>Tests</ThemedText>
            <ThemedText variant="small" color="textSecondary">Any subject, any class, any number</ThemedText>
          </View>
          <Button label="Create" variant="secondary" size="sm" onPress={openCreate} />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {tests.length === 0 ? (
            <ThemedText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.four }}>No tests created yet.</ThemedText>
          ) : (
            tests.map((t) => (
              <Pressable key={t.id} onPress={() => router.push(`/tests/${t.id}` as Href)}>
                <Card style={styles.row}>
                  <View style={[styles.iconWrap, { backgroundColor: Ink[50] }]}>
                    <ClipboardList size={18} color={Ink[600]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="small" numberOfLines={1}>{t.title}</ThemedText>
                    <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>
                      {t.subjectName} · Grade {t.gradeLevel}-{t.section} · {t.testDate}
                    </ThemedText>
                  </View>
                  <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{t.entriesCount}/{t.maxScore}</ThemedText>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>

        <Modal visible={creating} animationType="slide" onRequestClose={() => setCreating(false)}>
          <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <ThemedText variant="title" style={{ fontSize: 18 }}>Create Test</ThemedText>
                <Pressable onPress={() => setCreating(false)} hitSlop={8}><X size={20} color={theme.textSecondary} /></Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent}>
                {!!error && <ThemedText variant="small" style={{ color: theme.accent }}>{error}</ThemedText>}
                <ChipSelect label="Grade" options={GRADES} value={grade} onChange={changeGrade} />
                <ChipSelect label="Section" options={sectionsForGrade(grade)} value={section} onChange={setSection} />
                <View style={{ gap: 6 }}>
                  <ThemedText variant="label" color="textSecondary">Subject</ThemedText>
                  {subjectsForGrade.length === 0 ? (
                    <ThemedText variant="small" color="textMuted">No subjects set up for Grade {grade} yet.</ThemedText>
                  ) : (
                    <ChipSelect
                      options={subjectsForGrade.map((s) => s.name)}
                      value={subjectsForGrade.find((s) => s.id === subjectId)?.name ?? ''}
                      onChange={(name) => setSubjectId(subjectsForGrade.find((s) => s.name === name)?.id ?? '')}
                    />
                  )}
                </View>
                <View style={{ gap: 6 }}>
                  <ThemedText variant="label" color="textSecondary">Test title</ThemedText>
                  <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder="e.g. Chapter 4 Surprise Quiz"
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <ThemedText variant="label" color="textSecondary">Max score</ThemedText>
                  <TextInput
                    value={maxScore}
                    onChangeText={(v) => setMaxScore(v.replace(/\D/g, ''))}
                    keyboardType="number-pad"
                    style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                  />
                </View>
                <Button
                  label={saving ? 'Creating…' : 'Create Test'}
                  loading={saving}
                  disabled={!subjectId || !title.trim()}
                  onPress={handleCreate}
                  fullWidth
                />
              </ScrollView>
            </SafeAreaView>
          </ThemedView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, paddingBottom: Spacing.two, gap: Spacing.three },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconWrap: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four },
  modalContent: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
});
