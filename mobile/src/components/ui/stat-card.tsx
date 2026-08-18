import { StyleSheet, View } from 'react-native';
import { type LucideIcon } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/card';
import { Ink, Semantic } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function StatCard({
  icon: Icon,
  label,
  value,
  delta,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { value: string; direction: 'up' | 'down' | 'flat' };
}) {
  const theme = useTheme();

  return (
    <Card style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: Ink[50] }]}>
        <Icon size={18} color={Ink[600]} />
      </View>
      <ThemedText variant="small" color="textSecondary">{label}</ThemedText>
      <ThemedText variant="title" style={{ fontSize: 24, lineHeight: 30 }}>{value}</ThemedText>
      {delta && (
        <ThemedText
          variant="small"
          style={{ color: delta.direction === 'up' ? Semantic.success : delta.direction === 'down' ? Semantic.danger : theme.textMuted }}>
          {delta.value}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, flex: 1, minWidth: 140 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
});
