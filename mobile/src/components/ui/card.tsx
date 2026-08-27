import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Shadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Card({ style, ...rest }: ViewProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: theme.surface, borderColor: theme.border },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    // Shadow[2] instead of the previous Shadow[1] — every Card in the app
    // (every list row, stat tile, form section) picks this up automatically,
    // so the "premium" depth read is consistent everywhere at once rather
    // than only on the screens touched directly.
    ...Shadow[2],
  },
});
