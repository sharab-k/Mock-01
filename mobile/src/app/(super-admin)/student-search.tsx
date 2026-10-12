import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getMobileApi } from '@/lib/api/client';

type Hit = { id: string; fullName: string; rollNumber: string; grNumber: string | null; grade: string; section: string; status: string };

export default function StudentSearchScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const res = await getMobileApi<{ students: Hit[] }>(`/api/mobile/students/search?q=${encodeURIComponent(q)}`);
      if (cancelled) return;
      if (res.ok) { setHits(res.students); setError(null); } else setError(res.error);
      setLoading(false);
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const active = query.trim().length >= 2;
  const shownHits = active ? hits : [];

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <ScreenHeader title="Student Search" subtitle="Name or G.R. number" onBack={() => router.back()} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField placeholder="Search by name or G.R. no…" value={query} onChangeText={setQuery} autoCapitalize="none" />
          {active && loading && <ActivityIndicator color={theme.textMuted} />}
          {active && error && <ThemedText color="textSecondary">{error}</ThemedText>}
          {active && !loading && !error && hits.length === 0 && (
            <ThemedText color="textSecondary" style={{ textAlign: 'center' }}>No students match.</ThemedText>
          )}
          {shownHits.map((s) => (
            <Pressable key={s.id} onPress={() => router.push(`/record/${s.id}` as Href)}>
              <Card style={styles.row}>
                <Avatar name={s.fullName} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="bodyMedium">{s.fullName}</ThemedText>
                  <ThemedText variant="mono" color="textMuted" style={{ fontSize: 12 }}>
                    GR {s.grNumber ?? '—'} · Roll {s.rollNumber} · {s.grade}-{s.section}
                  </ThemedText>
                </View>
                <ChevronRight size={16} color={theme.textMuted} />
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: { padding: Spacing.four, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
