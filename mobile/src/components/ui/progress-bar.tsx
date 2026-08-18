import { StyleSheet, View } from 'react-native';

import { Radius, Semantic } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ProgressBar({ pct, tone = 'accent' }: { pct: number; tone?: 'accent' | 'success' | 'warning' }) {
  const theme = useTheme();
  const color = tone === 'success' ? Semantic.success : tone === 'warning' ? Semantic.warning : theme.accent;
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <View style={[styles.track, { backgroundColor: theme.surfaceElement }]}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 6, borderRadius: Radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.pill },
});
