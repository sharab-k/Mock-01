import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Ink, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ChipSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label?: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <ThemedText variant="label" color="textSecondary">{label}</ThemedText>}
      <View style={styles.row}>
        {options.map((opt) => {
          const active = opt === value;
          return (
            <Pressable
              key={opt}
              onPress={() => onChange(opt)}
              style={[styles.chip, { borderColor: active ? Ink[600] : theme.border, backgroundColor: active ? Ink[50] : theme.surface }]}>
              <ThemedText variant="small" style={active ? { color: Ink[700] } : undefined}>{opt}</ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
});
