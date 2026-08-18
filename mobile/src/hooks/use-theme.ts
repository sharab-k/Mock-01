import { Colors, type ThemeColorScheme } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeScheme(): ThemeColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}

export function useTheme() {
  return Colors[useThemeScheme()];
}
