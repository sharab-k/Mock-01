import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { SetPasswordModal } from '@/components/set-password-modal';
import { Ink, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchParentDirectory, setParentPasswordAction, type ParentDirectoryRow } from '@/lib/actions/parents';

export default function ParentDirectoryScreen() {
  const theme = useTheme();
  const [parents, setParents] = useState<ParentDirectoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [passwordTarget, setPasswordTarget] = useState<ParentDirectoryRow | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchParentDirectory().then((result) => {
      if (!mounted) return;
      if (!result.ok) { setError(result.error); return; }
      setParents(result.parents);
    });
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!parents) return [];
    const q = query.trim().toLowerCase();
    if (!q) return parents;
    return parents.filter((p) => p.name.toLowerCase().includes(q) || p.children.some((c) => c.name.toLowerCase().includes(q)));
  }, [parents, query]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Parent Directory" subtitle={parents ? `${parents.length} parent accounts` : undefined} onBack={() => router.back()} />
        </View>

        {error && (
          <View style={styles.centered}><ThemedText color="textSecondary">{error}</ThemedText></View>
        )}

        {!error && !parents && (
          <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>
        )}

        {parents && (
          <ScrollView contentContainerStyle={styles.list}>
            <TextField placeholder="Search by parent or child name…" value={query} onChangeText={setQuery} autoCapitalize="none" />
            {filtered.length === 0 && (
              <ThemedText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.four }}>No parents match this search.</ThemedText>
            )}
            {filtered.map((p) => (
              <Card key={p.key} style={{ gap: Spacing.two }}>
                <View style={styles.row}>
                  <Avatar name={p.name} size={36} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="small">{p.name}</ThemedText>
                    <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{p.email}</ThemedText>
                  </View>
                </View>
                <ThemedText variant="small" color="textMuted">{p.phone}</ThemedText>
                <View style={styles.chipsRow}>
                  {p.children.map((c) => (
                    <View key={c.roll} style={[styles.chip, { backgroundColor: theme.surfaceElement }]}>
                      <ThemedText variant="small" color="textSecondary">{c.name}</ThemedText>
                      <ThemedText variant="mono" color="textMuted" style={{ fontSize: 10 }}> · {c.grade}{c.section}</ThemedText>
                    </View>
                  ))}
                </View>
                <Pressable onPress={() => setPasswordTarget(p)} style={{ alignSelf: 'flex-start' }}>
                  <ThemedText variant="small" style={{ color: Ink[600] }}>Reset password</ThemedText>
                </Pressable>
              </Card>
            ))}
          </ScrollView>
        )}

        <SetPasswordModal
          visible={!!passwordTarget}
          targetName={passwordTarget?.name ?? ''}
          username={passwordTarget?.email ?? ''}
          onClose={() => setPasswordTarget(null)}
          onSubmit={(newPassword) => setParentPasswordAction({ id: passwordTarget!.key, newPassword })}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 },
});
