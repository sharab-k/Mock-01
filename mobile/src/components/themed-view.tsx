import { View, type ViewProps } from 'react-native';

import { type ThemeColorKey } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
  surface?: ThemeColorKey;
};

export function ThemedView({ style, surface = 'background', ...rest }: ThemedViewProps) {
  const theme = useTheme();
  return <View style={[{ backgroundColor: theme[surface] }, style]} {...rest} />;
}
