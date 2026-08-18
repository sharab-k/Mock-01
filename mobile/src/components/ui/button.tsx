import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Ink, Radius, Semantic } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

export type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
};

// The only accent this app has is ink — a `primary` button is always ink-600
// (ink-700 pressed), never a role color (CLAUDE.md §6). Role colors only
// ever reach RoleDot / RoleChip.
export function Button({ label, variant = 'primary', size = 'md', loading, fullWidth, disabled, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' ? styles.sm : styles.md,
        fullWidth && styles.fullWidth,
        variantStyle(variant, theme, pressed),
        isDisabled && styles.disabled,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? '#FFFFFF' : theme.accent} />
      ) : (
        <ThemedText
          variant="bodyMedium"
          style={[styles.label, { color: labelColor(variant, theme), fontFamily: FontFamily.sansMedium }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

function variantStyle(variant: ButtonVariant, theme: ReturnType<typeof useTheme>, pressed: boolean) {
  switch (variant) {
    case 'primary':
      return { backgroundColor: pressed ? Ink[700] : Ink[600] };
    case 'danger':
      // No separate "danger-pressed" shade exists in the token file — an
      // opacity dip on press is the honest choice over inventing an
      // undocumented darker red.
      return { backgroundColor: Semantic.danger, opacity: pressed ? 0.85 : 1 };
    case 'secondary':
      return { backgroundColor: pressed ? theme.surfaceElement : theme.surface, borderWidth: 1, borderColor: theme.border };
    case 'ghost':
      return { backgroundColor: pressed ? theme.surfaceElement : 'transparent' };
  }
}

function labelColor(variant: ButtonVariant, theme: ReturnType<typeof useTheme>) {
  if (variant === 'primary' || variant === 'danger') return theme.onAccent;
  return theme.text;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  md: { paddingVertical: 12, paddingHorizontal: 20 },
  sm: { paddingVertical: 8, paddingHorizontal: 14 },
  fullWidth: { alignSelf: 'stretch' },
  disabled: { opacity: 0.5 },
  label: { fontSize: 15 },
});
