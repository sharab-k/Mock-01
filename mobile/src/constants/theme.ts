// Design tokens transcribed 1:1 from the web app's app/globals.css @theme
// block (see C:\Mock-01\CLAUDE.md §6 — this is the single source of truth,
// don't hand-tune a hex value here without updating it there too). Web is
// light-only; the `dark` palette below is a mobile-only addition (native
// users toggle system dark mode far more than desktop dashboard users do),
// built from the same neutral/ink scale — never a new hue.

export const Neutral = {
  50: '#FBFAF9', 100: '#F5F4F2', 200: '#E9E6E2', 300: '#D6D2CC', 400: '#B5AEA6',
  500: '#938B80', 600: '#756C61', 700: '#5A5349', 800: '#3C372F', 900: '#26221D', 950: '#181511',
} as const;

export const Ink = {
  50: '#F5F6FA', 100: '#E8EBF3', 200: '#CED4E3', 300: '#A5B0CA', 400: '#6F83AE',
  500: '#495F8D', 600: '#334671', 700: '#233357', 800: '#18243E', 900: '#162757',
} as const;

export const Semantic = {
  success: '#3D7157', successBg: '#EAF5F0',
  warning: '#A97C2D', warningBg: '#F7F0E3',
  danger: '#973F35', dangerBg: '#F7EBE9',
} as const;

// Role identity — a 6px bar or small chip ONLY, never a full surface/card/
// background. Enforced by the RoleDot / RoleChip components, not by callers.
export const RoleColors = {
  super_admin: { fg: '#233357', bg: '#E8EBF3' },
  admissions_admin: { fg: '#A26D53', bg: '#F1ECE9' },
  attendance_admin: { fg: '#487A63', bg: '#EAF0ED' },
  marks_admin: { fg: '#7E587E', bg: '#EFECEF' },
  student: { fg: '#547B96', bg: '#EAEEF0' },
  parent: { fg: '#988671', bg: '#EFEDEC' },
} as const;

export type PortalRole = keyof typeof RoleColors;

export const Radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const;

export const Shadow = {
  1: { shadowColor: Neutral[900], shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  2: { shadowColor: Neutral[900], shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  3: { shadowColor: Ink[900], shadowOpacity: 0.18, shadowRadius: 40, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
} as const;

export const Spacing = { half: 2, one: 4, two: 8, three: 16, four: 24, five: 32, six: 64 } as const;

// Font family names as registered by useFonts() in app/_layout.tsx — must
// match the keys passed there exactly. Weight/style selection mirrors the
// web's next/font config: Plex Sans 400/500/600, Plex Mono 400/500,
// Newsreader 500/600 normal+italic, serif reserved for (auth)/login only.
export const FontFamily = {
  sans: 'IBMPlexSans_400Regular',
  sansMedium: 'IBMPlexSans_500Medium',
  sansSemiBold: 'IBMPlexSans_600SemiBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  serif: 'Newsreader_500Medium',
  serifSemiBold: 'Newsreader_600SemiBold',
  serifItalic: 'Newsreader_500Medium_Italic',
} as const;

export const Colors = {
  light: {
    text: Neutral[900],
    textSecondary: Neutral[600],
    textMuted: Neutral[500],
    background: Neutral[50],
    surface: '#FFFFFF',
    surfaceElement: Neutral[100],
    border: Neutral[200],
    accent: Ink[600],
    accentStrong: Ink[700],
    accentSurface: Ink[50],
    onAccent: '#FFFFFF',
  },
  dark: {
    text: Neutral[100],
    textSecondary: Neutral[400],
    textMuted: Neutral[500],
    background: Neutral[950],
    surface: Neutral[900],
    surfaceElement: Neutral[800],
    border: Neutral[800],
    accent: Ink[400],
    accentStrong: Ink[300],
    accentSurface: Ink[900],
    onAccent: Neutral[950],
  },
} as const;

export type ThemeColorScheme = keyof typeof Colors;
export type ThemeColorKey = keyof typeof Colors.light;

export const BottomTabInset = 0;
export const MaxContentWidth = 800;
