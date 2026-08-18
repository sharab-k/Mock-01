import { StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamily, type ThemeColorKey } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  variant?: 'title' | 'subtitle' | 'body' | 'bodyMedium' | 'small' | 'label' | 'mono' | 'serif' | 'serifTitle';
  color?: ThemeColorKey;
};

// The app's only Text primitive — every screen renders through this so
// Plex Sans/Mono stay the default and Newsreader only ever shows up where a
// `serif*` variant is explicitly requested (CLAUDE.md §6: serif is
// (auth)/login and PDF headers only, never a dashboard).
export function ThemedText({ style, variant = 'body', color, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[{ color: theme[color ?? 'text'] }, styles[variant], style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: FontFamily.sansSemiBold, fontSize: 28, lineHeight: 34 },
  subtitle: { fontFamily: FontFamily.sansSemiBold, fontSize: 20, lineHeight: 26 },
  body: { fontFamily: FontFamily.sans, fontSize: 15, lineHeight: 22 },
  bodyMedium: { fontFamily: FontFamily.sansMedium, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: FontFamily.sans, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: FontFamily.sansMedium, fontSize: 12, lineHeight: 16, letterSpacing: 0.3, textTransform: 'uppercase' },
  mono: { fontFamily: FontFamily.mono, fontSize: 14, lineHeight: 20 },
  serif: { fontFamily: FontFamily.serif, fontSize: 16, lineHeight: 24 },
  serifTitle: { fontFamily: FontFamily.serifSemiBold, fontSize: 30, lineHeight: 36 },
});
