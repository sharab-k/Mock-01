import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Check, Download } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';

// Stays mocked — matches web's StudentGuidesContent.tsx. No study-guides
// table exists in CLAUDE.md's schema.
const GUIDES = [
  { title: 'Algebra Reference Sheet', subject: 'Mathematics', date: '20 Jan 2026' },
  { title: 'Formula Booklet Term 2', subject: 'Physics', date: '18 Jan 2026' },
  { title: 'Periodic Table Chart', subject: 'Chemistry', date: '15 Jan 2026' },
  { title: 'Essay Writing Guide', subject: 'English', date: '12 Jan 2026' },
  { title: 'Grammar Quick Reference', subject: 'Urdu', date: '10 Jan 2026' },
  { title: 'Trigonometry Cheat Sheet', subject: 'Mathematics', date: '8 Jan 2026' },
  { title: 'Cell Diagram Handouts', subject: 'Biology', date: '5 Jan 2026' },
];

const SUBJECTS = ['All Subjects', ...Array.from(new Set(GUIDES.map((g) => g.subject)))] as const;

export default function StudentGuidesScreen() {
  const [subjectFilter, setSubjectFilter] = useState<(typeof SUBJECTS)[number]>('All Subjects');
  const [downloadedTitle, setDownloadedTitle] = useState<string | null>(null);

  const filtered = useMemo(
    () => (subjectFilter === 'All Subjects' ? GUIDES : GUIDES.filter((g) => g.subject === subjectFilter)),
    [subjectFilter],
  );

  function download(title: string) {
    setDownloadedTitle(title);
    setTimeout(() => setDownloadedTitle((cur) => (cur === title ? null : cur)), 2000);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Study Guides" subtitle={`${GUIDES.length} resources available`} onBack={() => router.back()} />
        <View style={{ paddingHorizontal: Spacing.four }}>
          <ChipSelect options={SUBJECTS} value={subjectFilter} onChange={setSubjectFilter} />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((g) => {
            const isDownloaded = downloadedTitle === g.title;
            return (
              <Card key={g.title} style={styles.row}>
                <View style={[styles.fileIcon, { borderColor: Ink[100], backgroundColor: Ink[50] }]}>
                  <ThemedText variant="label" style={{ color: Ink[500], fontSize: 8 }}>PDF</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="small" numberOfLines={1}>{g.title}</ThemedText>
                  <ThemedText variant="small" color="textMuted">{g.subject} · {g.date}</ThemedText>
                </View>
                <Pressable onPress={() => download(g.title)} style={styles.downloadBtn} hitSlop={8}>
                  {isDownloaded ? (
                    <><Check size={13} color={Semantic.success} /><ThemedText variant="small" style={{ color: Semantic.success }}>Downloaded</ThemedText></>
                  ) : (
                    <><Download size={13} color={Ink[600]} /><ThemedText variant="small" style={{ color: Ink[600] }}>Download</ThemedText></>
                  )}
                </Pressable>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <ThemedText color="textMuted" style={{ textAlign: 'center', marginTop: Spacing.six }}>
              No guides for this subject.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  list: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  fileIcon: { width: 34, height: 34, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  downloadBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
});
