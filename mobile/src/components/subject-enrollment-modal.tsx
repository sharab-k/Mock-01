import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChipSelect } from '@/components/ui/chip-select';
import { TextField } from '@/components/ui/text-field';
import { Ink, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchSubjectEnrollmentRoster, setSubjectEnrollmentAction, type EnrollmentRosterStudent } from '@/lib/subjects/enrollment';
import type { Subject } from '@/lib/subjects/fetch';

export function SubjectEnrollmentModal({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const theme = useTheme();
  const [roster, setRoster] = useState<EnrollmentRosterStudent[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState('All');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Deliberate: this modal stays mounted across different `subject`
    // selections (the parent always renders it, gating on subject
    // internally) rather than remounting, so resetting here is what stops a
    // stale roster from the previous subject flashing before the new fetch
    // resolves — same pattern as useLinkedChild's reload().
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!subject) { setRoster(null); return; }
    setRoster(null);
    setQuery('');
    setSectionFilter('All');
    setError('');
    fetchSubjectEnrollmentRoster(subject.id).then((result) => {
      if (!result.ok) { setError(result.error); return; }
      setRoster(result.roster);
      setSelected(new Set(result.roster.filter((s) => s.enrolled).map((s) => s.id)));
    });
  }, [subject]);

  if (!subject) return null;

  const sections = Array.from(new Set((roster ?? []).map((s) => s.section))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const filtered = (roster ?? []).filter((s) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || s.fullName.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q);
    return matchesQuery && (sectionFilter === 'All' || s.section === sectionFilter);
  });

  // Applies to exactly the students currently in view, so picking a class and
  // pressing "Select all" / "Clear" changes that whole class at once.
  function setInView(on: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of filtered) { if (on) next.add(s.id); else next.delete(s.id); }
      return next;
    });
    setSaved(false);
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!subject) return;
    setSaving(true);
    setError('');
    const outcome = await setSubjectEnrollmentAction(subject.id, Array.from(selected));
    setSaving(false);
    if (!outcome.ok) { setError(outcome.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="title" style={{ fontSize: 18 }}>{subject.name}</ThemedText>
              <ThemedText variant="mono" color="textMuted" style={{ fontSize: 12 }}>Grade {subject.gradeLevel} · {subject.type === 'elected' ? 'Elected' : 'Compulsory'} — who takes this subject</ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}><X size={20} color={theme.textSecondary} /></Pressable>
          </View>

          {!!error && <ThemedText variant="small" style={{ color: theme.accent, paddingHorizontal: Spacing.four }}>{error}</ThemedText>}

          {!roster ? (
            <View style={styles.centered}><ThemedText color="textSecondary">Loading roster…</ThemedText></View>
          ) : (
            <>
              <View style={{ paddingHorizontal: Spacing.four, gap: Spacing.two }}>
                <TextField placeholder="Search by name or roll…" value={query} onChangeText={setQuery} autoCapitalize="none" />
                <ChipSelect options={['All', ...sections]} value={sectionFilter} onChange={setSectionFilter} />
                <View style={styles.bulkRow}>
                  <Pressable onPress={() => setInView(true)} hitSlop={6}><ThemedText variant="small" style={{ color: Ink[700] }}>Select all shown</ThemedText></Pressable>
                  <Pressable onPress={() => setInView(false)} hitSlop={6}><ThemedText variant="small" color="textMuted">Clear shown</ThemedText></Pressable>
                </View>
                <ThemedText variant="small" color="textMuted">{selected.size} of {roster.length} students take this subject</ThemedText>
              </View>

              <ScrollView contentContainerStyle={styles.list}>
                {filtered.map((s) => {
                  const active = selected.has(s.id);
                  return (
                    <Pressable key={s.id} onPress={() => toggle(s.id)} style={styles.row}>
                      <View style={[styles.checkbox, { borderColor: active ? Ink[600] : theme.border, backgroundColor: active ? Ink[600] : 'transparent' }]} />
                      <Avatar name={s.fullName} size={32} />
                      <View style={{ flex: 1 }}>
                        <ThemedText variant="small">{s.fullName}</ThemedText>
                        <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{s.rollNumber}</ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
                {filtered.length === 0 && (
                  <ThemedText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.four }}>No students match.</ThemedText>
                )}
              </ScrollView>

              <View style={styles.footer}>
                <Button label={saved ? 'Saved' : saving ? 'Saving…' : 'Save'} variant={saved ? 'secondary' : 'primary'} loading={saving} onPress={handleSave} fullWidth />
              </View>
            </>
          )}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  bulkRow: { flexDirection: 'row', gap: Spacing.four },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: Spacing.four, paddingTop: Spacing.two, gap: Spacing.one, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 8 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5 },
  footer: { padding: Spacing.four, paddingTop: Spacing.two },
});
