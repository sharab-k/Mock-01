import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PortalRole, Radius, RoleColors } from '@/constants/theme';

// The ONLY two places a role color is allowed to appear (CLAUDE.md §6: "a
// 6px identity dot or a small chip only. Never a full card, sidebar, or page
// background."). There is deliberately no `RoleSurface`/`RoleCard` export.
export function RoleDot({ role, size = 6 }: { role: PortalRole; size?: number }) {
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: RoleColors[role].fg }}
    />
  );
}

export function RoleChip({ role, label }: { role: PortalRole; label: string }) {
  const colors = RoleColors[role];
  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      <View style={[styles.dot, { backgroundColor: colors.fg }]} />
      <ThemedText variant="label" style={{ color: colors.fg, textTransform: 'none' }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
