import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { CATEGORY_TONE, type Notice } from '@/lib/notices/types';

export function NoticeCard({ notice }: { notice: Notice }) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <StatusPill tone={CATEGORY_TONE[notice.category]} label={notice.category} />
        <ThemedText variant="small" color="textMuted">{notice.published_at}</ThemedText>
      </View>
      <ThemedText variant="bodyMedium">{notice.title}</ThemedText>
      <ThemedText variant="small" color="textSecondary" numberOfLines={3}>{notice.body}</ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
