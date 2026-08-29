import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { BookOpen, Plus, Users, X } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { SubjectEnrollmentModal } from '@/components/subject-enrollment-modal';
import { Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAsyncData } from '@/lib/use-async-data';
import { GRADES, type Grade } from '@/lib/students/constants';
import { fetchSubjects, createSubjectAction, removeSubjectAction, type Subject } from '@/lib/subjects/fetch';

const TYPE_TONE: Record<Subject['type'], { bg: string; text: string }> = {
  compulsory: { bg: '#E8EBF3', text: '#233357' },
  elected: { bg: Semantic.warningBg, text: Semantic.warning },
};

export default function SuperAdminSubjectsScreen() {
  const theme = useTheme();
  const state = useAsyncData(fetchSubjects, []);
  const [subjects, setSubjects] = useState<Subject[] | null>(null);
  const [addingForGrade, setAddingForGrade] = useState<Grade | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<Subject['type']>('compulsory');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [enrollTarget, setEnrollTarget] = useState<Subject | null>(null);

  const list = subjects ?? (state.status === 'ready' ? state.data : null);

  const byGrade = useMemo(() => {
    const map = new Map<string, Subject[]>();
    for (const g of GRADES) map.set(g, []);
    for (const s of list ?? []) map.get(s.gradeLevel)?.push(s);
    return map;
  }, [list]);

  function openAdd(grade: Grade) {
    setAddingForGrade(grade);
    setName('');
    setType('compulsory');
    setError('');
  }

  async function handleAdd() {
    if (!addingForGrade || !name.trim()) return;
    setSaving(true);
    setError('');
    const outcome = await createSubjectAction({ gradeLevel: addingForGrade, name: name.trim(), type });
    setSaving(false);
    if (!outcome.ok) { setError(outcome.error); return; }
    setSubjects([...(list ?? []), { id: outcome.id, gradeLevel: addingForGrade, name: name.trim(), type }]);
    setAddingForGrade(null);
  }

  function handleRemove(subject: Subject) {
    Alert.alert('Remove subject?', `${subject.name} will be removed from Grade ${subject.gradeLevel}. Existing tests and marks recorded against it are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const outcome = await removeSubjectAction(subject.id);
          if (outcome.ok) setSubjects((list ?? []).filter((s) => s.id !== subject.id));
        },
      },
    ]);
  }

  if (!list) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          {state.status === 'error' ? (
            <ThemedText color="textSecondary">{state.error}</ThemedText>
          ) : (
            <ActivityIndicator color={theme.accent} />
          )}
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Subjects" subtitle="Compulsory applies to the whole grade · Elected needs enrollment" onBack={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {GRADES.map((grade) => {
            const gradeSubjects = byGrade.get(grade) ?? [];
            return (
              <Card key={grade} style={{ gap: Spacing.two }}>
                <View style={styles.gradeHeader}>
                  <ThemedText variant="bodyMedium">Grade {grade}</ThemedText>
                  <Pressable onPress={() => openAdd(grade)} style={styles.addBtn} hitSlop={8}>
                    <Plus size={13} color={theme.accent} />
                    <ThemedText variant="small" style={{ color: theme.accent }}>Add subject</ThemedText>
                  </Pressable>
                </View>

                {gradeSubjects.length === 0 ? (
                  <ThemedText variant="small" color="textMuted">No subjects added yet.</ThemedText>
                ) : (
                  <View style={styles.chipsRow}>
                    {gradeSubjects.map((s) => {
                      const tone = TYPE_TONE[s.type];
                      return (
                        <View key={s.id} style={[styles.chip, { backgroundColor: tone.bg }]}>
                          <BookOpen size={11} color={tone.text} />
                          <ThemedText variant="small" style={{ color: tone.text }}>{s.name}</ThemedText>
                          {s.type === 'elected' && (
                            <Pressable onPress={() => setEnrollTarget(s)} hitSlop={6}>
                              <Users size={13} color={tone.text} />
                            </Pressable>
                          )}
                          <Pressable onPress={() => handleRemove(s)} hitSlop={6}>
                            <X size={13} color={tone.text} />
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>

        <Modal visible={!!addingForGrade} transparent animationType="fade" onRequestClose={() => setAddingForGrade(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
              <ThemedText variant="bodyMedium" style={{ marginBottom: Spacing.three }}>Add subject to Grade {addingForGrade}</ThemedText>
              {!!error && <ThemedText variant="small" style={{ color: Semantic.danger, marginBottom: Spacing.two }}>{error}</ThemedText>}
              <TextInput
                autoFocus
                value={name}
                onChangeText={setName}
                placeholder="Subject name…"
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholderTextColor={theme.textMuted}
              />
              <View style={{ marginTop: Spacing.three }}>
                <ChipSelect options={['Compulsory', 'Elected'] as const} value={type === 'compulsory' ? 'Compulsory' : 'Elected'} onChange={(v) => setType(v === 'Compulsory' ? 'compulsory' : 'elected')} />
              </View>
              <View style={{ flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.four }}>
                <View style={{ flex: 1 }}>
                  <Button label="Cancel" variant="secondary" onPress={() => setAddingForGrade(null)} disabled={saving} fullWidth />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label={saving ? 'Adding…' : 'Add'} loading={saving} disabled={!name.trim()} onPress={handleAdd} fullWidth />
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <SubjectEnrollmentModal subject={enrollTarget} onClose={() => setEnrollTarget(null)} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  gradeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: Radius.pill },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.four },
  modalSheet: { borderRadius: Radius.lg, padding: Spacing.four },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
});
