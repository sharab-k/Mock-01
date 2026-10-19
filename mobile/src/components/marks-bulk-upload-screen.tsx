import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { MarksBulkUploadModal } from '@/components/marks-bulk-upload-modal';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';

// Upload Marks page: explains the file layout and opens the Bulk upload popup.
export function MarksBulkUploadScreen() {
  const [open, setOpen] = useState(false);
  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <ScreenHeader title="Upload Marks" onBack={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText color="textSecondary">
            Upload a results spreadsheet and the marks are filed against each student, subject and exam date.
          </ThemedText>
          <Button label="Bulk upload" onPress={() => setOpen(true)} />
          <Card style={{ gap: Spacing.two }}>
            <ThemedText variant="small">
              <ThemedText variant="small" style={{ fontWeight: '600' }}>Result sheets </ThemedText>
              (one column per test): G.R. number and name down the side; for each test its date on top, then its total marks, then the subject. Several classes per file, and several tables per sheet, are fine. Shared columns such as M/B or CH/CM follow each student&apos;s stream. NILL, LEFT or &quot;not come&quot; mean no mark.
            </ThemedText>
            <ThemedText variant="small">
              <ThemedText variant="small" style={{ fontWeight: '600' }}>Simple lists </ThemedText>
              (one row per mark): GR No (or Roll No), Subject, Marks, Total, Exam Date.
            </ThemedText>
            <ThemedText variant="small" color="textMuted">
              You&apos;ll be asked whether the file is Monthly, Half-Yearly or Final, and shown a full check of the file before anything is saved.
            </ThemedText>
          </Card>
        </ScrollView>
      </SafeAreaView>
      <MarksBulkUploadModal visible={open} onClose={() => setOpen(false)} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: { padding: Spacing.four, gap: Spacing.three },
});
