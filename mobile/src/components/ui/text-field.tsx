import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamily, Radius, Semantic } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function TextField({
  label,
  error,
  style,
  ...rest
}: TextInputProps & { label?: string; error?: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label && <ThemedText variant="label" color="textSecondary">{label}</ThemedText>}
      <TextInput
        style={[
          styles.input,
          {
            fontFamily: FontFamily.sans,
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: error ? Semantic.danger : focused ? theme.accent : theme.border,
          },
          style,
        ]}
        placeholderTextColor={theme.textMuted}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        {...rest}
      />
      {error && <ThemedText variant="small" style={{ color: Semantic.danger }}>{error}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    fontSize: 15,
  },
});
