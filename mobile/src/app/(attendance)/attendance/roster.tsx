import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchActiveStudents, fetchAttendancePercentages, type AttendancePct } from '@/lib/attendance/attendance-stats';

type RosterRow = { id: string; name: string; roll: string; grade: string; section: string; pct: number };

export default function AttendanceRosterScreen() {
  const theme = useTheme();
  const [rows, setRows] = useState<RosterRow[] | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchActiveStudents(), fetchAttendancePercentages()]).then(([students, pctByStudent]) => {
      if (!mounted) return;
      const merged: RosterRow[] = students.map((s) => {
        const stat: AttendancePct = pctByStudent.get(s.id) ?? { pct: 0, present: 0, total: 0 };
        return { id: s.id, name: s.full_name, roll: s.roll_number, grade: s.grade_level, section: s.section, pct: stat.pct };
      });
      merged.sort((a, b) => a.pct - b.pct);
      setRows(merged);
    });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.roll.toLowerCase().includes(q));
  }, [rows, query]);

  if (!rows) {
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
          <ThemedText variant="title">Roster</ThemedText>
          <ThemedText variant="small" color="textSecondary">Sorted by attendance — lowest first</ThemedText>
        </View>

        <View style={styles.searchWrap}>
          <TextField
            placeholder="Search by name or roll number"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.centered}>
              <Search size={20} color={theme.textMuted} />
              <ThemedText color="textSecondary" style={{ marginTop: 8 }}>No students match this search.</ThemedText>
            </View>
          ) : (
            filtered.map((r) => (
              <Card key={r.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="small">{r.name}</ThemedText>
                  <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>
                    {r.roll} · Grade {r.grade}-{r.section}
                  </ThemedText>
                </View>
                <ThemedText variant="bodyMedium" style={{ color: r.pct < 75 ? Semantic.danger : r.pct < 90 ? Semantic.warning : Semantic.success }}>
                  {r.pct}%
                </ThemedText>
              </Card>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.six },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  searchWrap: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
