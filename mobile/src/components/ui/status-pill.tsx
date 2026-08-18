import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Ink, Neutral, Radius, Semantic } from '@/constants/theme';

// Status pills are the ONLY place besides the ink accent where color carries
// meaning (CLAUDE.md §6) — present/absent/late, pass/fail, tier bands, and
// nothing else gets a new semantic color. 'ink' reuses the one always-legal
// accent (mirrors the web's Merit-tier treatment, ink-600/ink-50) rather
// than inventing a fourth semantic hue.
export type PillTone = 'success' | 'warning' | 'danger' | 'ink' | 'neutral';

const TONE_LABEL_DEFAULTS: Record<Exclude<PillTone, 'neutral' | 'ink'>, string> = {
  success: 'Present',
  warning: 'Late',
  danger: 'Absent',
};

export function StatusPill({ tone, label }: { tone: PillTone; label?: string }) {
  const colors = toneColors(tone);
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg }]}>
      <ThemedText variant="label" style={{ color: colors.fg, textTransform: 'none' }}>
        {label ?? (tone in TONE_LABEL_DEFAULTS ? TONE_LABEL_DEFAULTS[tone as keyof typeof TONE_LABEL_DEFAULTS] : '—')}
      </ThemedText>
    </View>
  );
}

function toneColors(tone: PillTone) {
  switch (tone) {
    case 'success': return { fg: Semantic.success, bg: Semantic.successBg };
    case 'warning': return { fg: Semantic.warning, bg: Semantic.warningBg };
    case 'danger': return { fg: Semantic.danger, bg: Semantic.dangerBg };
    case 'ink': return { fg: Ink[600], bg: Ink[50] };
    case 'neutral': return { fg: Neutral[600], bg: Neutral[100] };
  }
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
});
