import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { BookOpen, Check } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchStudentSubjects, setStudentElectivesAction, type StudentSubjectRow } from '@/lib/subjects/student-subjects';

// Super Admin's per-student subject editor inside the Edit Student modal.
// Compulsory subjects are implicit for the whole grade (read-only); elected
// ones are toggled for this one student and saved together.
export function StudentSubjectsSection({ studentId, gradeLevel }: { studentId: string; gradeLevel: string }) {
  const theme = useTheme();
  const [subjects, setSubjects] = useState<StudentSubjectRow[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchStudentSubjects(studentId).then((res) => {
      if (!mounted) return;
      if (!res.ok) { setError(res.error); setSubjects([]); return; }
      const on = new Set(res.subjects.filter((s) => s.type === 'elected' && s.enrolled).map((s) => s.id));
      setSubjects(res.subjects);
      setPicked(on);
      setSaved(on);
    });
    return () => { mounted = false; };
  }, [studentId]);

  const compulsory = (subjects ?? []).filter((s) => s.type === 'compulsory');
  const elected = (subjects ?? []).filter((s) => s.type === 'elected');
  const dirty = picked.size !== saved.size || [...picked].some((id) => !saved.has(id));

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setJustSaved(false);
  }

  async function save() {
    setSaving(true);
    setError('');
    const outcome = await setStudentElectivesAction(studentId, [...picked]);
    setSaving(false);
    if (!outcome.ok) { setError(outcome.error); return; }
    setSaved(new Set(picked));
    setJustSaved(true);
  }

  return (
    <View style={{ gap: Spacing.two }}>
      <ThemedText variant="label" color="textMuted" style={{ marginTop: Spacing.two }}>Subjects · Grade {gradeLevel}</ThemedText>

      {subjects === null ? (
        <ActivityIndicator color={theme.accent} />
      ) : subjects.length === 0 ? (
        <ThemedText variant="small" color="textMuted">No subjects set up for this grade yet.</ThemedText>
      ) : (
        <>
          {compulsory.length > 0 && (
            <View style={{ gap: 6 }}>
              <ThemedText variant="small" color="textMuted">Compulsory — every student in the grade</ThemedText>
              <View style={styles.chips}>
                {compulsory.map((s) => (
                  <View key={s.id} style={[styles.chip, { backgroundColor: Ink[100] }]}>
                    <BookOpen size={11} color={Ink[700]} />
                    <ThemedText variant="small" style={{ color: Ink[700] }}>{s.name}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
          )}

          {elected.length > 0 && (
            <View style={{ gap: 6 }}>
              <ThemedText variant="small" color="textMuted">Elected — tap to add or remove for this student</ThemedText>
              <View style={styles.chips}>
                {elected.map((s) => {
                  const on = picked.has(s.id);
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => toggle(s.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, { borderWidth: 1, borderColor: on ? Semantic.warning : theme.border, backgroundColor: on ? Semantic.warningBg : theme.surface }]}>
                      {on ? <Check size={11} color={Semantic.warning} /> : <BookOpen size={11} color={theme.textMuted} />}
                      <ThemedText variant="small" style={{ color: on ? Semantic.warning : theme.textSecondary }}>{s.name}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {!!error && <ThemedText variant="small" style={{ color: Semantic.danger }}>{error}</ThemedText>}

          {elected.length > 0 && (
            <Button
              label={saving ? 'Saving…' : justSaved && !dirty ? 'Subjects saved' : 'Save subjects'}
              variant="secondary"
              loading={saving}
              disabled={!dirty}
              onPress={save}
              fullWidth
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
});
