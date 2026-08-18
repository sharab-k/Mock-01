import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase/client';
import { fetchChildAcademicData, type ChildAcademicData } from '@/lib/parent/child-academic-data';

export default function StudentMarksScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const theme = useTheme();
  const [data, setData] = useState<ChildAcademicData | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchChildAcademicData(supabase, studentId).then((d) => { if (mounted) setData(d); });
    return () => { mounted = false; };
  }, [studentId]);

  if (!data) {
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
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText variant="title">Marks</ThemedText>

          <Card style={{ gap: 2 }}>
            {data.marks.length === 0 ? (
              <ThemedText color="textSecondary">No marks recorded yet.</ThemedText>
            ) : (
              data.marks.map((m, i) => (
                <View key={i} style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="bodyMedium">{m.subject}</ThemedText>
                    <ThemedText variant="small" color="textMuted">{m.exam}</ThemedText>
                  </View>
                  <ThemedText variant="mono" color="textSecondary">{m.score}/{m.max}</ThemedText>
                  <StatusPill tone="ink" label={m.grade} />
                </View>
              ))
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 12 },
});
