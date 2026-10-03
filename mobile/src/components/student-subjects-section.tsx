import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { BookOpen, Check } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchStudentSubjects, setStudentSubjectsAction, type StudentSubjectRow } from '@/lib/subjects/student-subjects';

// Super Admin's per-student subject editor inside the Edit Student modal.
// Every subject of the grade is a toggle: compulsory ones start on (a student
// can still be taken off one), elected ones start off until enrolled. Saved
// together as the student's exact subject set.
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
      const on = new Set(res.subjects.filter((s) => s.enrolled).map((s) => s.id));
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
    const outcome = await setStudentSubjectsAction(studentId, [...picked]);
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
          {[
            { key: 'compulsory', items: compulsory, hint: 'Compulsory — on for everyone by default; tap to take one off this student' },
            { key: 'elected', items: elected, hint: 'Elected — tap to add or remove for this student' },
          ].map((group) => group.items.length > 0 && (
            <View key={group.key} style={{ gap: 6 }}>
              <ThemedText variant="small" color="textMuted">{group.hint}</ThemedText>
              <View style={styles.chips}>
                {group.items.map((s) => {
                  const on = picked.has(s.id);
                  const tone = s.type === 'compulsory' ? { fg: Ink[700], bg: Ink[100], border: Ink[200] } : { fg: Semantic.warning, bg: Semantic.warningBg, border: Semantic.warning };
                  return (
                    <Pressable
                      key={s.id}
                      onPress={() => toggle(s.id)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[styles.chip, { borderWidth: 1, borderColor: on ? tone.border : theme.border, backgroundColor: on ? tone.bg : theme.surface }]}>
                      {on ? <Check size={11} color={tone.fg} /> : <BookOpen size={11} color={theme.textMuted} />}
                      <ThemedText variant="small" style={{ color: on ? tone.fg : theme.textMuted, textDecorationLine: on ? 'none' : 'line-through' }}>{s.name}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {!!error && <ThemedText variant="small" style={{ color: Semantic.danger }}>{error}</ThemedText>}

          <Button
            label={saving ? 'Saving…' : justSaved && !dirty ? 'Subjects saved' : 'Save subjects'}
            variant="secondary"
            loading={saving}
            disabled={!dirty}
            onPress={save}
            fullWidth
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
});
