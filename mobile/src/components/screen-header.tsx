import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  trailing,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  trailing?: ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <ChevronLeft size={20} color={theme.textSecondary} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <ThemedText variant="title" style={{ fontSize: 20, lineHeight: 26 }}>{title}</ThemedText>
        {subtitle && <ThemedText variant="small" color="textSecondary">{subtitle}</ThemedText>}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { padding: 4, marginLeft: -8 },
});
