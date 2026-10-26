import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarDays, FileText, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Ink, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { currentMonthKey, monthOptionLabel, recentMonths } from '@/lib/reports/months';
import { registerReportChoiceHost, type ReportChoice } from '@/lib/reports/report-choice';

// The popup behind every "Download progress report" button: pick the month,
// then either that month's report or the full record up to its end. Mounted
// once in the root layout.
export function ReportChoiceHost() {
  const theme = useTheme();
  const [resolver, setResolver] = useState<((c: ReportChoice | null) => void) | null>(null);
  const [month, setMonth] = useState(currentMonthKey());
  const months = useMemo(() => recentMonths(18), []);

  useEffect(() => {
    registerReportChoiceHost((resolve) => {
      setMonth(currentMonthKey());
      setResolver(() => resolve);
    });
    return () => registerReportChoiceHost(null);
  }, []);

  function finish(choice: ReportChoice | null) {
    resolver?.(choice);
    setResolver(null);
  }

  const label = monthOptionLabel(month);

  return (
    <Modal visible={resolver !== null} animationType="slide" transparent onRequestClose={() => finish(null)}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => finish(null)} />
        <SafeAreaView style={styles.sheetWrap}>
          <ThemedView style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <View style={styles.header}>
              <ThemedText variant="title" style={{ fontSize: 16 }}>Download progress report</ThemedText>
              <Pressable onPress={() => finish(null)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <X size={18} color={theme.textMuted} />
              </Pressable>
            </View>

            <ThemedText variant="label" color="textMuted">Month</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {months.map((m) => {
                const on = m.key === month;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setMonth(m.key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, { borderColor: on ? Ink[600] : theme.border, backgroundColor: on ? Ink[50] : theme.surface }]}>
                    <ThemedText variant="small" style={{ color: on ? Ink[700] : theme.textSecondary }}>{m.label}</ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable onPress={() => finish({ kind: 'month', month })} style={[styles.option, { borderColor: theme.border }]} accessibilityRole="button">
              <CalendarDays size={18} color={Ink[700]} />
              <View style={styles.optionText}>
                <ThemedText variant="bodyMedium">{label} report</ThemedText>
                <ThemedText variant="small" color="textMuted">Attendance, fee and marks of {label} only.</ThemedText>
              </View>
            </Pressable>
            <Pressable onPress={() => finish({ kind: 'full', month })} style={[styles.option, { borderColor: theme.border }]} accessibilityRole="button">
              <FileText size={18} color={Ink[700]} />
              <View style={styles.optionText}>
                <ThemedText variant="bodyMedium">Full progress report</ThemedText>
                <ThemedText variant="small" color="textMuted">Everything up to the end of {label}.</ThemedText>
              </View>
            </Pressable>
          </ThemedView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetWrap: { width: '100%' },
  sheet: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: Spacing.three, gap: Spacing.three },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chips: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingHorizontal: 14, paddingVertical: 8, flexShrink: 0 },
  option: { flexDirection: 'row', gap: Spacing.three, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.three, alignItems: 'flex-start' },
  optionText: { flex: 1, gap: 2 },
});
