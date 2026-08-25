import { Colors, type ThemeColorScheme } from '@/constants/theme';

// The web app is explicitly light-only (CLAUDE.md §6 design system) — no
// dark mode exists there at all. Mobile previously followed the device's
// system dark/light setting, which meant the two apps visually diverged on
// any phone with dark mode on. Forcing light here keeps mobile matching the
// website's actual design system rather than inventing a second look for
// itself.
export function useThemeScheme(): ThemeColorScheme {
  return 'light';
}

export function useTheme() {
  return Colors[useThemeScheme()];
}
