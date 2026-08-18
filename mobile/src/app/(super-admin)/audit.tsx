import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlertTriangle } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchAuditLog, type AuditEntry } from '@/lib/audit/fetch';

export default function AuditLogScreen() {
  const theme = useTheme();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchAuditLog().then((result) => {
      if (!mounted) return;
      if (!result.ok) { setError(result.error); return; }
      setEntries(result.entries);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Audit Log" subtitle="Master raw log — every action, most recent first" onBack={() => router.back()} />
        </View>

        {error && (
          <View style={styles.centered}>
            <ThemedText color="textSecondary">{error}</ThemedText>
          </View>
        )}

        {!error && !entries && (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.accent} />
          </View>
        )}

        {entries && (
          <ScrollView contentContainerStyle={styles.list}>
            {entries.length === 0 ? (
              <ThemedText color="textSecondary">No actions logged yet.</ThemedText>
            ) : (
              entries.map((e) => (
                <Card key={e.id} style={{ gap: 4 }}>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="small" color="textSecondary">{e.actor}</ThemedText>
                    <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{e.date} · {e.time}</ThemedText>
                  </View>
                  <View style={styles.actionRow}>
                    {e.flag && <AlertTriangle size={13} color={Semantic.danger} />}
                    <ThemedText variant="small" style={{ flex: 1, color: e.flag ? Semantic.danger : theme.text }}>{e.action}</ThemedText>
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.six },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
});
