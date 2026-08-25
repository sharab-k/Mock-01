import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2, ChevronDown, Clock3, XCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { submitClassAttendanceAction } from '@/lib/actions/attendance';
import { fetchMarkerClasses, type MarkerClass } from '@/lib/attendance/marker-classes';
import { lateCutoffLabel } from '@/lib/attendance/late-policy';

type Status = 'present' | 'absent' | 'late';

const STATUS_CONFIG: Record<Status, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  present: { label: 'Present', icon: CheckCircle2, color: Semantic.success, bg: Semantic.successBg },
  absent: { label: 'Absent', icon: XCircle, color: Semantic.danger, bg: Semantic.dangerBg },
  late: { label: 'Late', icon: Clock3, color: Semantic.warning, bg: Semantic.warningBg },
};

function initRecord(students: MarkerClass['students']): Record<string, Status> {
  return Object.fromEntries(students.map((s) => [s.id, 'present' as Status]));
}

export default function AttendanceMarkScreen() {
  const theme = useTheme();
  const [classes, setClasses] = useState<MarkerClass[] | null>(null);
  const [activeClassId, setActiveClassId] = useState<string>('');
  const [records, setRecords] = useState<Record<string, Record<string, Status>>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetchMarkerClasses().then((data) => {
      if (!mounted) return;
      setClasses(data);
      setActiveClassId(data[0]?.id ?? '');
      setRecords(Object.fromEntries(data.map((c) => [c.id, initRecord(c.students)])));
    });
    return () => { mounted = false; };
  }, []);

  const activeClass = useMemo(() => classes?.find((c) => c.id === activeClassId) ?? classes?.[0] ?? null, [classes, activeClassId]);
  const classRecord = activeClass ? records[activeClass.id] ?? {} : {};
  const counts = {
    present: Object.values(classRecord).filter((s) => s === 'present').length,
    absent: Object.values(classRecord).filter((s) => s === 'absent').length,
    late: Object.values(classRecord).filter((s) => s === 'late').length,
  };
  const isSubmitted = activeClass ? !!submitted[activeClass.id] : false;

  function setStatus(studentId: string, status: Status) {
    if (!activeClass) return;
    setRecords((prev) => ({ ...prev, [activeClass.id]: { ...prev[activeClass.id], [studentId]: status } }));
    setSubmitted((prev) => ({ ...prev, [activeClass.id]: false }));
  }

  function markAllPresent() {
    if (!activeClass) return;
    setRecords((prev) => ({ ...prev, [activeClass.id]: initRecord(activeClass.students) }));
    setSubmitted((prev) => ({ ...prev, [activeClass.id]: false }));
  }

  async function handleSubmit() {
    if (!activeClass) return;
    setSubmitting(true);
    const result = await submitClassAttendanceAction({
      classLabel: activeClass.label,
      records: activeClass.students.map((s) => ({ studentId: s.id, studentName: s.name, status: classRecord[s.id] })),
    });
    setSubmitting(false);
    if (result.ok) setSubmitted((prev) => ({ ...prev, [activeClass.id]: true }));
  }

  if (!classes || !activeClass) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (classes.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered, { padding: Spacing.four }]}>
          <ThemedText variant="bodyMedium" style={{ textAlign: 'center' }}>No classes with enrolled students yet</ThemedText>
          <ThemedText variant="small" color="textMuted" style={{ textAlign: 'center', marginTop: 4 }}>
            Enrol students in Admissions before marking attendance.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <ThemedText variant="title" style={{ fontSize: 20, lineHeight: 26 }}>Mark Attendance</ThemedText>
            <ThemedText variant="small" color="textSecondary">Late: {lateCutoffLabel(activeClass.grade, activeClass.section)}</ThemedText>
          </View>
          <Pressable onPress={() => setPickerOpen(true)} style={[styles.classPicker, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
            <ThemedText variant="small">{activeClass.label}</ThemedText>
            <ChevronDown size={14} color={theme.textMuted} />
          </Pressable>
        </View>

        <View style={[styles.summaryBar, { borderColor: theme.border }]}>
          {(['present', 'absent', 'late'] as Status[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            const Icon = cfg.icon;
            return (
              <View key={s} style={styles.summaryItem}>
                <View style={[styles.summaryIcon, { backgroundColor: cfg.bg }]}>
                  <Icon size={14} color={cfg.color} />
                </View>
                <View>
                  <ThemedText variant="bodyMedium">{counts[s]}</ThemedText>
                  <ThemedText variant="small" color="textMuted">{cfg.label}</ThemedText>
                </View>
              </View>
            );
          })}
          <Pressable onPress={markAllPresent} style={[styles.allPresentBtn, { backgroundColor: Semantic.successBg }]}>
            <ThemedText variant="small" style={{ color: Semantic.success }}>All Present</ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {activeClass.students.map((student) => {
            const current = classRecord[student.id];
            const currentCfg = current ? STATUS_CONFIG[current] : null;
            return (
              <Card key={student.id} style={styles.studentRow}>
                <View style={[styles.avatar, { backgroundColor: currentCfg?.bg ?? Ink[50] }]}>
                  <ThemedText variant="mono" style={{ fontSize: 11, color: currentCfg?.color ?? Ink[600] }}>{student.initials}</ThemedText>
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText variant="small" numberOfLines={1}>{student.name}</ThemedText>
                  <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{student.roll}</ThemedText>
                </View>
                <View style={styles.statusButtons}>
                  {(['present', 'absent', 'late'] as Status[]).map((status) => {
                    const cfg = STATUS_CONFIG[status];
                    const Icon = cfg.icon;
                    const active = current === status;
                    return (
                      <Pressable
                        key={status}
                        disabled={isSubmitted}
                        onPress={() => setStatus(student.id, status)}
                        accessibilityRole="button"
                        accessibilityLabel={`Mark ${student.name} ${cfg.label}`}
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.statusBtn,
                          { backgroundColor: active ? cfg.color : cfg.bg, opacity: isSubmitted ? 0.6 : 1 },
                        ]}>
                        <Icon size={14} color={active ? '#FFFFFF' : cfg.color} strokeWidth={2.5} />
                      </Pressable>
                    );
                  })}
                </View>
              </Card>
            );
          })}
        </ScrollView>

        <View style={[styles.footer, { borderColor: theme.border }]}>
          {isSubmitted ? (
            <View style={styles.submittedRow}>
              <CheckCircle2 size={16} color={Semantic.success} />
              <ThemedText variant="bodyMedium" style={{ color: Semantic.success }}>Attendance submitted</ThemedText>
            </View>
          ) : (
            <Button label={submitting ? 'Submitting…' : 'Submit Attendance'} loading={submitting} onPress={handleSubmit} fullWidth />
          )}
        </View>

        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
            <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
              <ScrollView>
                {classes.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => { setActiveClassId(c.id); setPickerOpen(false); }}
                    style={[styles.modalRow, c.id === activeClass.id && { backgroundColor: Ink[50] }]}>
                    <ThemedText variant="small" style={c.id === activeClass.id ? { color: Ink[700] } : undefined}>{c.label}</ThemedText>
                    <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{c.students.length}</ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four, paddingBottom: Spacing.two },
  classPicker: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: 12 },
  summaryBar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth },
  summaryItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  allPresentBtn: { marginLeft: 'auto', borderRadius: Radius.md, paddingVertical: 6, paddingHorizontal: 10 },
  list: { padding: Spacing.four, gap: Spacing.two, paddingBottom: Spacing.three },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statusButtons: { flexDirection: 'row', gap: 6 },
  statusBtn: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  footer: { padding: Spacing.four, borderTopWidth: StyleSheet.hairlineWidth },
  submittedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '60%', borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, paddingVertical: Spacing.two },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: Spacing.four },
});
