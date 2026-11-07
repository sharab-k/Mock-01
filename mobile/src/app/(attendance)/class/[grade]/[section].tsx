import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { monthTitle, shiftMonth } from '@/lib/attendance/month';
import { MessageSquare, MessageSquareWarning } from 'lucide-react-native';

import { TextField } from '@/components/ui/text-field';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { markAttendanceAction, sendAbsenceAlertAction, submitClassAttendanceAction } from '@/lib/actions/attendance';
import { fetchClassRoster, type RosterStatus, type RosterStudent } from '@/lib/attendance/class-roster';
import { lateCutoffLabel } from '@/lib/attendance/late-policy';

const STATUS_TONE = { unmarked: 'neutral', present: 'success', absent: 'danger', late: 'warning', leave: 'neutral' } as const;
// Same cycle as the web class view: a tap flips between present and absent
// (late/unmarked go to present first).
const NEXT_STATUS: Record<RosterStatus, 'present' | 'absent'> = { unmarked: 'present', present: 'absent', absent: 'present', late: 'present', leave: 'present' };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// One class's roster for today, in roll-number order — the list never
// re-sorts while you mark, so you can work straight down it. Tap a status to
// mark (an absence also alerts the parent's portal); absent students show
// their alert status with Send / Resend.
export default function ClassDetailScreen() {
  const { grade, section } = useLocalSearchParams<{ grade: string; section: string }>();
  return <ClassDetailBody grade={grade} section={section} />;
}

function ClassDetailBody({ grade, section }: { grade: string; section: string }) {
  const theme = useTheme();
  const [classDate, setClassDate] = useState(today());
  const classDateValid = /^\d{4}-\d{2}-\d{2}$/.test(classDate) && !Number.isNaN(Date.parse(classDate)) && classDate <= today();
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [alertPending, setAlertPending] = useState<Record<string, boolean>>({});
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNote, setBulkNote] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!classDateValid) return;
    fetchClassRoster(grade, section, classDate).then((result) => {
      if (!mounted) return;
      if (!result.ok) { setError(result.error); return; }
      setRoster(result.roster);
    });
    return () => { mounted = false; };
  }, [grade, section, classDate, classDateValid]);

  function patchStudent(id: string, patch: Partial<RosterStudent>) {
    setRoster((prev) => (prev ? prev.map((s) => (s.id === id ? { ...s, ...patch } : s)) : prev));
  }

  // Approved leave is excused: no absence alert, and it is left out of the attendance rate. A second tap puts the student back to present.
  async function cycleStatus(student: RosterStudent, to?: 'leave') {
    if (pending[student.id]) return;
    const previous = student.status;
    const status = to === 'leave' ? (previous === 'leave' ? 'present' : 'leave') : NEXT_STATUS[previous];
    setPending((p) => ({ ...p, [student.id]: true }));
    patchStudent(student.id, { status });

    const outcome = await markAttendanceAction({ studentId: student.id, studentName: student.name, status, classDate });
    setPending((p) => ({ ...p, [student.id]: false }));
    if (!outcome.ok) { patchStudent(student.id, { status: previous }); return; }
    if (status === 'absent' && outcome.notified) patchStudent(student.id, { alertStatus: 'sent' });
  }

  // Sets the whole class to Present or Absent in one request; each student can still be changed after.
  // Students already at that status are skipped; a confirmation is asked before overwriting anyone
  // already marked, and before alerting a whole class of parents.
  function markAll(status: 'present' | 'absent') {
    const targets = (roster ?? []).filter((s) => s.status !== status);
    if (targets.length === 0 || bulkBusy) return;
    const overwriting = targets.filter((s) => s.status !== 'unmarked').length;
    const question = status === 'absent'
      ? `Mark all ${targets.length} student${targets.length === 1 ? '' : 's'} absent? Their parents will be notified.`
      : overwriting > 0 ? `${overwriting} already marked. Change all ${targets.length} to present?` : null;
    if (!question) { void applyAll(status, targets); return; }
    Alert.alert(status === 'absent' ? 'Mark all absent' : 'Mark all present', question, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Yes, mark', style: status === 'absent' ? 'destructive' : 'default', onPress: () => { void applyAll(status, targets); } },
    ]);
  }

  async function applyAll(status: 'present' | 'absent', targets: RosterStudent[]) {
    setBulkBusy(true);
    setBulkNote(null);
    const previous = new Map(targets.map((s) => [s.id, s.status]));
    targets.forEach((s) => patchStudent(s.id, { status }));
    const outcome = await submitClassAttendanceAction({
      classDate,
      classLabel: `Grade ${grade} · Section ${section}`,
      records: targets.map((s) => ({ studentId: s.id, studentName: s.name, status })),
    });
    setBulkBusy(false);
    if (!outcome.ok) {
      targets.forEach((s) => patchStudent(s.id, { status: previous.get(s.id) ?? 'unmarked' }));
      setBulkNote(outcome.error);
      return;
    }
    setBulkNote(status === 'present' ? `${targets.length} marked present. Tap a status to mark anyone absent.` : `${targets.length} marked absent. Tap a status to change anyone who is here.`);
  }

  async function sendAlert(student: RosterStudent) {
    if (alertPending[student.id]) return;
    setAlertPending((p) => ({ ...p, [student.id]: true }));
    const outcome = await sendAbsenceAlertAction({ studentId: student.id, studentName: student.name, classDate });
    setAlertPending((p) => ({ ...p, [student.id]: false }));
    if (outcome.ok && outcome.notified > 0) patchStudent(student.id, { alertStatus: outcome.sent ? 'sent' : 'failed' });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title={`Grade ${grade} · Section ${section}`} subtitle={`${classDate === today() ? 'Today' : classDate} · Late: ${lateCutoffLabel(grade, section)}`} onBack={() => router.back()} />
        </View>

        {(grade === '11' || grade === '12') && (
          <Pressable
            onPress={() => router.replace(`/attendance/${grade === '11' ? 'first-year' : 'second-year'}?section=${section}` as Href)}
            accessibilityRole="button"
            style={{ marginHorizontal: Spacing.four, marginBottom: Spacing.two }}>
            <ThemedText variant="small" style={{ color: Ink[700] }}>Whole-day marking · Mark {grade === '11' ? 'First' : 'Second'} Year by subject instead →</ThemedText>
          </Pressable>
        )}

        <View style={{ paddingHorizontal: Spacing.four }}>
          <View style={styles.monthRow}>
            <Pressable onPress={() => setClassDate(shiftMonth(classDate, -1, today()))} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8}>
              <ThemedText variant="small" style={{ color: Ink[700] }}>‹ Prev</ThemedText>
            </Pressable>
            <ThemedText variant="small">{monthTitle(classDate)}</ThemedText>
            <Pressable onPress={() => setClassDate(shiftMonth(classDate, 1, today()))} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} disabled={classDate >= today()}>
              <ThemedText variant="small" style={{ color: classDate >= today() ? '#B5AEA6' : Ink[700] }}>Next ›</ThemedText>
            </Pressable>
          </View>
          <TextField label="Attendance date (YYYY-MM-DD)" value={classDate} onChangeText={(v) => setClassDate(v.replace(/[^\d-]/g, '').slice(0, 10))} keyboardType="numbers-and-punctuation" autoCapitalize="none" />
        </View>

        {error && (
          <View style={styles.centered}>
            <ThemedText color="textSecondary">{error}</ThemedText>
          </View>
        )}

        {!error && !roster && (
          <View style={styles.centered}>
            <ActivityIndicator color={theme.accent} />
          </View>
        )}

        {roster && (
          <ScrollView contentContainerStyle={styles.list}>
            {roster.length > 0 && (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => markAll('present')}
                    disabled={bulkBusy || roster.every((s) => s.status === 'present')}
                    accessibilityRole="button"
                    style={[styles.allPresentBtn, { backgroundColor: Semantic.successBg, opacity: bulkBusy || roster.every((s) => s.status === 'present') ? 0.5 : 1 }]}>
                    <ThemedText variant="small" style={{ color: Semantic.success }}>{bulkBusy ? 'Marking…' : 'All Present'}</ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => markAll('absent')}
                    disabled={bulkBusy || roster.every((s) => s.status === 'absent')}
                    accessibilityRole="button"
                    style={[styles.allPresentBtn, { backgroundColor: Semantic.dangerBg, opacity: bulkBusy || roster.every((s) => s.status === 'absent') ? 0.5 : 1 }]}>
                    <ThemedText variant="small" style={{ color: Semantic.danger }}>All Absent</ThemedText>
                  </Pressable>
                </View>
                {bulkNote ? <ThemedText variant="small" color="textSecondary">{bulkNote}</ThemedText> : null}
              </View>
            )}
            {roster.length === 0 ? (
              <ThemedText color="textSecondary">No students in this class.</ThemedText>
            ) : (
              roster.map((s, i) => (
                <Card key={s.id} style={{ gap: 8 }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{i + 1} · GR {s.gr ?? '—'}</ThemedText>
                      <ThemedText variant="small">{s.name}</ThemedText>
                    </View>
                    <Pressable
                      onPress={() => cycleStatus(s)}
                      disabled={pending[s.id]}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`${s.name} is ${s.status}. Tap to change.`}
                      style={{ opacity: pending[s.id] ? 0.5 : 1 }}>
                      <StatusPill tone={STATUS_TONE[s.status]} label={s.status === 'unmarked' ? 'Tap to mark' : undefined} />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => cycleStatus(s, 'leave')} disabled={pending[s.id]} hitSlop={8} accessibilityRole="button" accessibilityLabel={s.status === 'leave' ? `Remove leave for ${s.name}` : `Mark ${s.name} on leave`}>
                    <ThemedText variant="small" style={{ color: Ink[700] }}>{s.status === 'leave' ? 'On leave — tap to undo' : 'Mark on leave'}</ThemedText>
                  </Pressable>
                  <ThemedText variant="small" color="textMuted">
                    Term: {s.termAttendance.present}P · {s.termAttendance.absent}A · {s.termAttendance.late}L / {s.termAttendance.total}
                  </ThemedText>
                  {s.status === 'absent' && (
                    <View style={styles.row}>
                      <View style={styles.alertBadge}>
                        {s.alertStatus === 'sent' && (<><MessageSquare size={12} color={Semantic.success} /><ThemedText variant="small" style={{ color: Semantic.success }}>Notified</ThemedText></>)}
                        {s.alertStatus === 'failed' && (<><MessageSquareWarning size={12} color={Semantic.danger} /><ThemedText variant="small" style={{ color: Semantic.danger }}>Alert failed</ThemedText></>)}
                        {s.alertStatus === null && <ThemedText variant="small" color="textMuted">Not sent</ThemedText>}
                      </View>
                      {s.hasParent && (
                        <Pressable onPress={() => sendAlert(s)} disabled={alertPending[s.id]} hitSlop={8} style={[styles.alertBtn, { backgroundColor: Ink[50], opacity: alertPending[s.id] ? 0.5 : 1 }]}>
                          <ThemedText variant="small" style={{ color: Ink[700] }}>
                            {alertPending[s.id] ? 'Sending…' : s.alertStatus ? 'Resend' : 'Send Alert'}
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  )}
                </Card>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  allPresentBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md },
});
