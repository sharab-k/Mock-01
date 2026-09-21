import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { NoticeCard } from '@/components/notice-card';
import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchVisibleNotices } from '@/lib/notices/fetch';
import type { Notice } from '@/lib/notices/types';

// Read-only — matches web's AdmissionsNoticesContent ("managed by Super
// Admin"). Unfiltered by audience, unlike the parent/student notices screen,
// since admissions staff need to see the full published set.
export default function AdmissionsNoticesScreen() {
  const theme = useTheme();
  const [notices, setNotices] = useState<Notice[] | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchVisibleNotices().then((data) => { if (mounted) setNotices(data); });
    return () => { mounted = false; };
  }, []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScreenHeader title="Notices" subtitle="Read-only · managed by Super Admin" onBack={() => router.back()} />
        {!notices ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: Spacing.six }} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>
            {notices.length === 0 ? (
              <ThemedText color="textSecondary">No notices yet.</ThemedText>
            ) : (
              notices.map((n) => <NoticeCard key={n.id} notice={n} />)
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
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.six },
});
