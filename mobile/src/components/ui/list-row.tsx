import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

export function ListRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
}: {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onPress?: () => void;
}) {
  const theme = useTheme();
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.row,
        { borderBottomColor: theme.border },
        pressed && onPress ? { backgroundColor: theme.surfaceElement } : null,
      ]}>
      {leading}
      <View style={styles.text}>
        <ThemedText variant="bodyMedium">{title}</ThemedText>
        {subtitle && <ThemedText variant="small" color="textSecondary">{subtitle}</ThemedText>}
      </View>
      {trailing ?? (onPress && <ChevronRight size={18} color={theme.textMuted} />)}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, gap: 2 },
});
