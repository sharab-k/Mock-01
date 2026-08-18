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
    ...Shadow[1],
  },
});
