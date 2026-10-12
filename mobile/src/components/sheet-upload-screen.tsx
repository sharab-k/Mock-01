import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { uploadSheet, type SheetUploadResult } from '@/lib/api/client';

type Kind = 'marks' | 'attendance';

const COPY: Record<Kind, { title: string; blurb: string; columns: string; notes: string[] }> = {
  marks: {
    title: 'Upload Marks',
    blurb: 'Pick an Excel (.xlsx) or CSV file of results. Each row is one student, one subject, one exam, with its own exam date.',
    columns: 'GR No (or Roll No) · Subject · Exam (Monthly / Half-Yearly / Final) · Marks · Total (default 100) · Exam Date',
    notes: [
      'Dates: DD/MM/YYYY or YYYY-MM-DD, not in the future.',
      'Uploading the same student, subject, exam and date again updates the earlier mark.',
      'A template is available from the website (Upload Marks → Download a template).',
    ],
  },
  attendance: {
    title: 'Upload Attendance',
    blurb: 'Pick an Excel (.xlsx) or CSV file of attendance. Each row is one student on one day, so past days can be filled in too.',
    columns: 'GR No (or Roll No) · Date · Status (Present / Absent / Late)',
    notes: [
      'Dates: DD/MM/YYYY or YYYY-MM-DD, not in the future.',
      'Uploading a student and day again corrects the earlier mark.',
      'A student newly marked Absent gets the notice in their parent portal.',
    ],
  },
};

// One screen for both spreadsheet uploads (marks / attendance) — the file is
// parsed and validated on the server, which reports every skipped row.
export function SheetUploadScreen({ kind }: { kind: Kind }) {
  const theme = useTheme();
  const copy = COPY[kind];
  const [fileName, setFileName] = useState('');
  const [asset, setAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SheetUploadResult | null>(null);

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
    setFileName(picked.assets[0].name);
    setResult(null);
    setError('');
  }

  async function upload() {
    if (!asset) return;
    setBusy(true);
    setError('');
    setResult(null);
    const res = await uploadSheet(kind, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType, file: asset.file });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setResult(res);
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <ScreenHeader title={copy.title} onBack={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText color="textSecondary">{copy.blurb}</ThemedText>
          <Card style={{ gap: Spacing.two }}>
            <ThemedText variant="label" color="textMuted">Columns</ThemedText>
            <ThemedText variant="small">{copy.columns}</ThemedText>
            {copy.notes.map((n) => <ThemedText key={n} variant="small" color="textMuted">• {n}</ThemedText>)}
          </Card>

          <Button variant="secondary" label={fileName ? `Chosen: ${fileName}` : 'Choose .xlsx or .csv file'} onPress={pick} />
          <Button label={busy ? 'Uploading…' : 'Upload'} onPress={upload} disabled={!asset || busy} />
          {busy && <ActivityIndicator color={theme.accent} />}

          {error !== '' && <ThemedText style={{ color: Semantic.danger }}>{error}</ThemedText>}

          {result && (
            <Card style={{ gap: Spacing.two }}>
              <ThemedText variant="bodyMedium">
                {result.saved} of {result.totalRows} rows saved{result.skipped > 0 ? ` · ${result.skipped} skipped` : ''}
              </ThemedText>
              <ThemedText variant="small" color="textMuted">
                {kind === 'marks' ? `${result.inserted ?? 0} new, ${result.updated ?? 0} updated.` : `${result.absent ?? 0} absent record(s) included.`}
              </ThemedText>
              {result.errors.map((e, i) => (
                <ThemedText key={i} variant="small">
                  <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{e.row > 0 ? `Row ${e.row}: ` : 'Batch: '}</ThemedText>
                  {e.message}
                </ThemedText>
              ))}
              {result.skipped > result.errors.length && (
                <ThemedText variant="small" color="textMuted">Showing the first {result.errors.length} problems.</ThemedText>
              )}
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: { padding: Spacing.four, gap: Spacing.three },
});
