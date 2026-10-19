import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { uploadSheet } from '@/lib/api/client';
import { EXAM_LABEL, type ExamType, type MarksUploadResult, type UploadRowError } from '@/lib/marks/upload-types';

const EXAMS: { value: ExamType; hint: string }[] = [
  { value: 'monthly', hint: 'Monthly tests' },
  { value: 'half_yearly', hint: 'Half-yearly exam' },
  { value: 'final', hint: 'Final exam' },
];

type Step = 'setup' | 'checking' | 'preview' | 'saving' | 'done';

function ProblemList({ title, rows, color }: { title: string; rows: UploadRowError[]; color: string }) {
  const [open, setOpen] = useState(rows.length <= 6);
  if (rows.length === 0) return null;
  return (
    <Card style={{ gap: Spacing.two }}>
      <Pressable onPress={() => setOpen(!open)} accessibilityRole="button">
        <ThemedText variant="bodyMedium" style={{ color }}>{title} ({rows.length}) {open ? '▲' : '▼'}</ThemedText>
      </Pressable>
      {open && rows.map((e, i) => (
        <ThemedText key={i} variant="small">
          <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{e.row > 0 ? `Row ${e.row}: ` : 'File: '}</ThemedText>
          {e.message}
        </ThemedText>
      ))}
    </Card>
  );
}

// The "Bulk upload" popup: asks which exam the file is for (Monthly,
// Half-Yearly or Final), reads the chosen spreadsheet and shows what it found
// — and every row it cannot use — before anything is saved. Saving is a
// separate, explicit step.
export function MarksBulkUploadModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [notify, setNotify] = useState(false);
  const [step, setStep] = useState<Step>('setup');
  const [error, setError] = useState('');
  const [result, setResult] = useState<MarksUploadResult | null>(null);

  const busy = step === 'checking' || step === 'saving';

  function reset() {
    setExamType(null); setAsset(null); setNotify(false); setStep('setup'); setError(''); setResult(null);
  }

  function close() {
    if (busy) return;
    reset();
    onClose();
  }

  async function pick() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/comma-separated-values',
        'application/csv',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    setAsset(picked.assets[0]);
    setError('');
  }

  async function send(dryRun: boolean) {
    if (!asset || !examType) return;
    setError('');
    setStep(dryRun ? 'checking' : 'saving');
    const res = await uploadSheet<MarksUploadResult>(
      'marks',
      { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, file: asset.file },
      { examType, dryRun: dryRun ? '1' : '0', notify: notify ? '1' : '0' },
    );
    if (!res.ok) {
      setError(res.error);
      setStep(dryRun ? 'setup' : 'preview');
      return;
    }
    setResult(res);
    setStep(dryRun ? 'preview' : 'done');
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.header}>
            <ThemedText variant="subtitle">Bulk upload marks</ThemedText>
            <Pressable onPress={close} disabled={busy} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {(step === 'setup' || step === 'checking') && (
              <>
                <View style={{ gap: Spacing.two }}>
                  <ThemedText variant="label" color="textMuted">1 · WHICH EXAM IS THIS FILE FOR?</ThemedText>
                  {EXAMS.map((e) => {
                    const active = examType === e.value;
                    return (
                      <Pressable
                        key={e.value}
                        onPress={() => setExamType(e.value)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[styles.option, { borderColor: active ? Ink[600] : theme.border, backgroundColor: active ? Ink[50] : theme.surface }]}>
                        <ThemedText variant="bodyMedium" style={active ? { color: Ink[700] } : undefined}>{EXAM_LABEL[e.value]}</ThemedText>
                        <ThemedText variant="small" color="textMuted">{e.hint}</ThemedText>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={{ gap: Spacing.two }}>
                  <ThemedText variant="label" color="textMuted">2 · CHOOSE THE RESULTS FILE</ThemedText>
                  <Button variant="secondary" label={asset ? `Chosen: ${asset.name}` : 'Choose .xlsx or .csv file'} onPress={pick} />
                  <ThemedText variant="small" color="textMuted">
                    Dates, subjects, G.R. numbers, names and marks are read automatically — one column per test (date on top, then its total, then the subject), one row per student.
                  </ThemedText>
                </View>

                <View style={styles.switchRow}>
                  <ThemedText variant="small" style={{ flex: 1 }}>
                    Also send each parent a result notice for every mark saved (leave off for results already announced)
                  </ThemedText>
                  <Switch value={notify} onValueChange={setNotify} />
                </View>
              </>
            )}

            {error !== '' && <ThemedText style={{ color: Semantic.danger }}>{error}</ThemedText>}

            {(step === 'preview' || step === 'saving' || step === 'done') && result && (
              <View style={{ gap: Spacing.three }}>
                <View style={{ gap: 4 }}>
                  <ThemedText variant="subtitle">
                    {step === 'done'
                      ? `${result.saved} marks saved (${result.inserted} new, ${result.updated} updated)`
                      : `${result.toSave} marks ready to save for ${result.students} students`}
                  </ThemedText>
                  <ThemedText variant="small" color="textMuted">
                    {EXAM_LABEL[result.examType]} exam · {result.totalRows} student rows read
                    {result.noMark > 0 ? ` · ${result.noMark} cells with no mark (NILL / LEFT / not come)` : ''}
                  </ThemedText>
                </View>

                {result.skipped > 0 && (
                  <ThemedText variant="small" style={{ color: Semantic.warning }}>
                    {result.skipped} problem{result.skipped === 1 ? '' : 's'} found. Those marks are NOT saved; everything else {step === 'done' ? 'was' : 'will be'} saved. Fix them in the file (or the student&apos;s record) and upload again.
                  </ThemedText>
                )}

                <ProblemList title="Problems (not saved)" rows={result.errors} color={Semantic.danger} />
                <ProblemList title="Check these matches" rows={result.warnings} color={Semantic.warning} />
                <ProblemList title="Tests found in the file" rows={result.tests.map((t) => ({ row: 0, message: t }))} color={theme.text} />
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            {step === 'done' ? (
              <Button label="Done" onPress={close} />
            ) : step === 'setup' || step === 'checking' ? (
              <Button label={step === 'checking' ? 'Reading file…' : 'Check file'} onPress={() => send(true)} disabled={!examType || !asset || busy} />
            ) : (
              <>
                <Button label={step === 'saving' ? 'Saving…' : `Save ${result?.toSave ?? 0} marks`} onPress={() => send(false)} disabled={!result || result.toSave === 0 || busy} />
                <Button variant="secondary" label="Choose another file" onPress={() => { setResult(null); setStep('setup'); }} disabled={busy} />
              </>
            )}
            {busy && <ActivityIndicator color={theme.accent} />}
          </View>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, gap: Spacing.four },
  option: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, gap: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  footer: { padding: Spacing.four, gap: Spacing.two },
});
