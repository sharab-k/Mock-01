import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Ink } from '@/constants/theme';

// Initials-on-ink-100 (text ink-700) until real photography exists — never a
// generated or stock face for a named person (CLAUDE.md §6).
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = getInitials(name);
  return (
    <View
      style={[
        styles.base,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: Ink[100] },
      ]}>
      <ThemedText variant="label" style={{ color: Ink[700], textTransform: 'none', fontSize: size * 0.38 }}>
        {initials}
      </ThemedText>
    </View>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
