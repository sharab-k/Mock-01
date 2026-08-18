import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NoticeCard } from '@/components/notice-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchVisibleNotices } from '@/lib/notices/fetch';
import type { Notice } from '@/lib/notices/types';

// Filtered to All/Students — the parent-audience subset shows on the parent
// dashboard instead, mirroring the web's split between the two surfaces.
export default function StudentNoticesScreen() {
  const theme = useTheme();
  const [notices, setNotices] = useState<Notice[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchVisibleNotices().then((all) => {
      if (!mounted) return;
      setNotices(all.filter((n) => n.audience === 'All' || n.audience === 'Students'));
    });
    return () => { mounted = false; };
  }, []);

  if (!notices) {
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
          <ThemedText variant="title">Notices</ThemedText>
          {notices.length === 0 ? (
            <ThemedText color="textSecondary">No notices right now.</ThemedText>
          ) : (
            notices.map((n) => <NoticeCard key={n.id} notice={n} />)
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
});
