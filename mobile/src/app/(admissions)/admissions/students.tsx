import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchStudentDirectory, type DirectoryStudent } from '@/lib/admissions/fetch';

export default function AdmissionsStudentsScreen() {
  const theme = useTheme();
  const [students, setStudents] = useState<DirectoryStudent[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    fetchStudentDirectory().then((data) => { if (mounted) setStudents(data); });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!students) return [];
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q));
  }, [students, query]);

  if (!students) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText variant="title">Students</ThemedText>
          <ThemedText variant="small" color="textSecondary">{students.length} enrolled</ThemedText>
        </View>

        <View style={styles.searchWrap}>
          <TextField placeholder="Search by name or roll number" value={query} onChangeText={setQuery} autoCapitalize="none" />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {filtered.map((s) => (
            <Card key={s.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="small">{s.full_name}</ThemedText>
                <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>
                  {s.roll_number} · Grade {s.grade}-{s.section}
                </ThemedText>
              </View>
              <StatusPill tone={s.status === 'Active' ? 'success' : 'neutral'} label={s.status} />
            </Card>
          ))}
          {filtered.length === 0 && <ThemedText color="textSecondary">No students match this search.</ThemedText>}
        </ScrollView>

        <View style={styles.footer}>
          <Button label="Enrol Student" onPress={() => router.push('/students/new')} fullWidth />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  searchWrap: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  footer: { padding: Spacing.four, paddingTop: 0 },
});
