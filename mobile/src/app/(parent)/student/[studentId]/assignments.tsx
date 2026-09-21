import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { FileCheck2, UploadCloud, X } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type AssignStatus = 'Submitted' | 'Pending' | 'Not Started';
type Assignment = { id: string; subject: string; title: string; due: string; status: AssignStatus };

// Stays mocked — matches web's StudentAssignmentsContent.tsx. No
// assignments/assignment_submissions tables exist per CLAUDE.md's schema, so
// this is deliberately UI-only/local-state on both platforms.
const INITIAL: Assignment[] = [
  { id: 'a1', subject: 'Mathematics', title: 'Chapter 5 – Practice Set', due: '28 Jan 2026', status: 'Submitted' },
  { id: 'a2', subject: 'Physics', title: 'Lab Report – Motion Exp.', due: '30 Jan 2026', status: 'Pending' },
  { id: 'a3', subject: 'English', title: 'Descriptive Essay Draft', due: '2 Feb 2026', status: 'Pending' },
  { id: 'a4', subject: 'Chemistry', title: 'Atomic Models Assignment', due: '5 Feb 2026', status: 'Not Started' },
  { id: 'a5', subject: 'Urdu', title: 'Mazmoon Nigari', due: '7 Feb 2026', status: 'Not Started' },
  { id: 'a6', subject: 'Mathematics', title: 'Chapter 6 – Word Problems', due: '18 Jan 2026', status: 'Submitted' },
];

const STATUS_TONE: Record<AssignStatus, 'success' | 'warning' | 'neutral'> = {
  Submitted: 'success', Pending: 'warning', 'Not Started': 'neutral',
};

const FILTERS = ['All', 'Pending', 'Not Started', 'Submitted'] as const;

export default function StudentAssignmentsScreen() {
  const theme = useTheme();
  const [assignments, setAssignments] = useState<Assignment[]>(INITIAL);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
  const [submitTarget, setSubmitTarget] = useState<Assignment | null>(null);
  const [fileName, setFileName] = useState('');

  const filtered = useMemo(
    () => (filter === 'All' ? assignments : assignments.filter((a) => a.status === filter)),
    [assignments, filter],
  );

  // No document-picker dependency in this app yet, and this feature has no
  // backend to actually receive a file either way — a fixed stand-in name
  // mirrors what a real attach would look like without adding one just for
  // a mocked flow.
  function attachFile() {
    setFileName(`${submitTarget?.subject ?? 'assignment'}-submission.pdf`);
  }

  function confirmSubmit() {
    if (!submitTarget) return;
    setAssignments((prev) => prev.map((a) => (a.id === submitTarget.id ? { ...a, status: 'Submitted' } : a)));
    setSubmitTarget(null);
    setFileName('');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader
          title="Course Assignments"
          subtitle={`${assignments.length} total · ${assignments.filter((a) => a.status !== 'Submitted').length} outstanding`}
          onBack={() => router.back()}
        />
        <View style={{ paddingHorizontal: Spacing.four }}>
          <ChipSelect options={FILTERS} value={filter} onChange={setFilter} />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((a) => (
            <Card key={a.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="small" numberOfLines={1}>{a.title}</ThemedText>
                <ThemedText variant="small" color="textMuted">{a.subject} · {a.due}</ThemedText>
              </View>
              <StatusPill tone={STATUS_TONE[a.status]} label={a.status} />
              {a.status !== 'Submitted' && (
                <Pressable
                  onPress={() => { setFileName(''); setSubmitTarget(a); }}
                  style={[styles.actionBtn, { backgroundColor: Ink[700] }]}>
                  <ThemedText variant="small" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                    {a.status === 'Not Started' ? 'Begin' : 'Submit'}
                  </ThemedText>
                </Pressable>
              )}
            </Card>
          ))}
          {filtered.length === 0 && (
            <ThemedText color="textMuted" style={{ textAlign: 'center', marginTop: Spacing.six }}>
              No assignments in this status.
            </ThemedText>
          )}
        </ScrollView>

        <Modal visible={!!submitTarget} transparent animationType="fade" onRequestClose={() => setSubmitTarget(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSubmitTarget(null)}>
            <Pressable style={[styles.modalSheet, { backgroundColor: theme.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <ThemedText variant="title" style={{ fontSize: 16 }}>Submit Assignment</ThemedText>
                <Pressable onPress={() => setSubmitTarget(null)} hitSlop={8}><X size={18} color={theme.textSecondary} /></Pressable>
              </View>
              <ThemedText variant="small" color="textSecondary" style={{ marginBottom: Spacing.three }}>
                {submitTarget?.title} · {submitTarget?.subject}
              </ThemedText>
              <Pressable
                onPress={attachFile}
                style={[
                  styles.dropzone,
                  { borderColor: fileName ? Semantic.success : theme.border, backgroundColor: fileName ? Semantic.successBg : theme.surfaceElement },
                ]}>
                {fileName ? (
                  <>
                    <FileCheck2 size={22} color={Semantic.success} />
                    <ThemedText variant="small" style={{ textAlign: 'center' }}>{fileName}</ThemedText>
                    <ThemedText variant="small" style={{ color: Ink[600] }}>Tap to change file</ThemedText>
                  </>
                ) : (
                  <>
                    <UploadCloud size={22} color={theme.textMuted} />
                    <ThemedText variant="small" color="textMuted">Tap to choose a file</ThemedText>
                  </>
                )}
              </Pressable>
              <Button label="Submit" disabled={!fileName} onPress={confirmSubmit} fullWidth />
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.md },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: Spacing.four },
  modalSheet: { borderRadius: Radius.lg, padding: Spacing.four, gap: Spacing.three },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropzone: { borderWidth: 2, borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: 28, alignItems: 'center', gap: 8 },
});
