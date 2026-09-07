import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Clock3, Pencil, Plus, Trash2, User, X } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GRADES, sectionsForGrade, type Grade, type Section } from '@/lib/students/constants';
import { fetchTeachers, type Teacher } from '@/lib/teachers/fetch';
import {
  fetchClassTimetable, createTimetablePeriodAction, updateTimetablePeriodAction, deleteTimetablePeriodAction,
  WEEKDAYS, WEEKDAY_LABEL, type TimetablePeriod, type Weekday,
} from '@/lib/timetable/fetch';

type FormState = {
  id?: string;
  dayOfWeek: Weekday;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
};

const emptyForm = (day: Weekday): FormState => ({ dayOfWeek: day, startTime: '', endTime: '', subject: '', teacherId: '' });

export default function SuperAdminTimetableScreen() {
  const theme = useTheme();
  const [grade, setGrade] = useState<Grade>(GRADES[0]);
  const [section, setSection] = useState<Section>(sectionsForGrade(GRADES[0])[0]);
  const [periods, setPeriods] = useState<TimetablePeriod[] | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load(g: Grade, s: Section) {
    fetchClassTimetable(g, s).then(setPeriods);
  }

  useEffect(() => {
    // Deliberate: resets to loading whenever grade/section changes so a
    // stale previous class's periods never flash before the new fetch
    // resolves — same pattern as useAsyncData/useLinkedChild elsewhere.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPeriods(null);
    load(grade, section);
  }, [grade, section]);
  useEffect(() => { fetchTeachers().then(setTeachers); }, []);

  function changeGrade(g: Grade) {
    setGrade(g);
    setSection(sectionsForGrade(g)[0]);
  }

  const byDay = useMemo(() => {
    const map = new Map<Weekday, TimetablePeriod[]>();
    for (const d of WEEKDAYS) map.set(d, []);
    for (const p of periods ?? []) map.get(p.dayOfWeek)?.push(p);
    return map;
  }, [periods]);

  function openCreate(day: Weekday) {
    setForm(emptyForm(day));
    setError('');
  }

  function openEdit(p: TimetablePeriod) {
    setForm({ id: p.id, dayOfWeek: p.dayOfWeek, startTime: p.startTime.slice(0, 5), endTime: p.endTime.slice(0, 5), subject: p.subject, teacherId: p.teacherId ?? '' });
    setError('');
  }

  async function handleSave() {
    if (!form || !form.startTime || !form.endTime || !form.subject.trim()) return;
    setSaving(true);
    setError('');
    const input = {
      gradeLevel: grade, section, dayOfWeek: form.dayOfWeek,
      startTime: form.startTime, endTime: form.endTime,
      subject: form.subject.trim(), teacherId: form.teacherId,
    };
    const outcome = form.id
      ? await updateTimetablePeriodAction(form.id, input)
      : await createTimetablePeriodAction(input);
    setSaving(false);
    if (!outcome.ok) { setError(outcome.error); return; }
    setForm(null);
    load(grade, section);
  }

  function handleDelete(id: string) {
    Alert.alert('Remove this period?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { const o = await deleteTimetablePeriodAction(id); if (o.ok) load(grade, section); } },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Class Timetable" subtitle="One weekly schedule per class, used all year" onBack={() => router.back()} />
        </View>

        <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.two }}>
          <ChipSelect label="Grade" options={GRADES} value={grade} onChange={changeGrade} />
          <ChipSelect label="Section" options={sectionsForGrade(grade)} value={section} onChange={setSection} />
        </View>

        {!periods ? (
          <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {WEEKDAYS.map((day) => {
              const dayPeriods = byDay.get(day) ?? [];
              return (
                <Card key={day} style={{ gap: Spacing.two }}>
                  <View style={styles.dayHeader}>
                    <ThemedText variant="bodyMedium">{WEEKDAY_LABEL[day]}</ThemedText>
                    <Pressable onPress={() => openCreate(day)} style={styles.addBtn} hitSlop={8}>
                      <Plus size={13} color={theme.accent} />
                      <ThemedText variant="small" style={{ color: theme.accent }}>Add</ThemedText>
                    </Pressable>
                  </View>

                  {dayPeriods.length === 0 ? (
                    <ThemedText variant="small" color="textMuted">No periods yet.</ThemedText>
                  ) : (
                    dayPeriods.map((p) => (
                      <View key={p.id} style={[styles.periodRow, { borderColor: theme.border }]}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.rowInline}>
                            <Clock3 size={11} color={theme.textMuted} />
                            <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{p.startTime.slice(0, 5)}–{p.endTime.slice(0, 5)}</ThemedText>
                          </View>
                          <ThemedText variant="small" style={{ marginTop: 2 }}>{p.subject}</ThemedText>
                          {p.teacherName && (
                            <View style={styles.rowInline}>
                              <User size={11} color={theme.textMuted} />
                              <ThemedText variant="small" color="textMuted">{p.teacherName}</ThemedText>
                            </View>
                          )}
                        </View>
                        <Pressable onPress={() => openEdit(p)} hitSlop={8} style={{ padding: 4 }}><Pencil size={14} color={theme.textMuted} /></Pressable>
                        <Pressable onPress={() => handleDelete(p.id)} hitSlop={8} style={{ padding: 4 }}><Trash2 size={14} color={Semantic.danger} /></Pressable>
                      </View>
                    ))
                  )}
                </Card>
              );
            })}
          </ScrollView>
        )}

        <Modal visible={!!form} animationType="slide" onRequestClose={() => setForm(null)}>
          <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <ThemedText variant="title" style={{ fontSize: 18 }}>{form?.id ? 'Edit' : 'Add'} period{form ? ` — ${WEEKDAY_LABEL[form.dayOfWeek]}` : ''}</ThemedText>
                <Pressable onPress={() => setForm(null)} hitSlop={8}><X size={20} color={theme.textSecondary} /></Pressable>
              </View>
              {form && (
                <ScrollView contentContainerStyle={styles.modalContent}>
                  {!!error && <ThemedText variant="small" style={{ color: Semantic.danger }}>{error}</ThemedText>}
                  <View style={styles.timeRow}>
                    <View style={{ flex: 1, gap: 6 }}>
                      <ThemedText variant="label" color="textSecondary">Start time</ThemedText>
                      <TextInput
                        value={form.startTime}
                        onChangeText={(v) => setForm({ ...form, startTime: v })}
                        placeholder="08:00"
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      <ThemedText variant="label" color="textSecondary">End time</ThemedText>
                      <TextInput
                        value={form.endTime}
                        onChangeText={(v) => setForm({ ...form, endTime: v })}
                        placeholder="08:45"
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        placeholderTextColor={theme.textMuted}
                      />
                    </View>
                  </View>
                  <View style={{ gap: 6 }}>
                    <ThemedText variant="label" color="textSecondary">Subject</ThemedText>
                    <TextInput
                      value={form.subject}
                      onChangeText={(v) => setForm({ ...form, subject: v })}
                      placeholder="e.g. Mathematics"
                      style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                      placeholderTextColor={theme.textMuted}
                    />
                  </View>
                  <View style={{ gap: 6 }}>
                    <ThemedText variant="label" color="textSecondary">Teacher (optional)</ThemedText>
                    <ChipSelect
                      options={['Unassigned', ...teachers.map((t) => t.full_name)] as const}
                      value={teachers.find((t) => t.id === form.teacherId)?.full_name ?? 'Unassigned'}
                      onChange={(name) => setForm({ ...form, teacherId: name === 'Unassigned' ? '' : teachers.find((t) => t.full_name === name)?.id ?? '' })}
                    />
                  </View>
                  <Button
                    label={saving ? 'Saving…' : form.id ? 'Save Changes' : 'Add Period'}
                    loading={saving}
                    disabled={!form.startTime || !form.endTime || !form.subject.trim()}
                    onPress={handleSave}
                    fullWidth
                  />
                </ScrollView>
              )}
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
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  periodRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four },
  modalContent: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  timeRow: { flexDirection: 'row', gap: Spacing.three },
  input: { borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14 },
});
