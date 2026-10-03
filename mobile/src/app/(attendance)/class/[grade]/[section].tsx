import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { MessageSquare, MessageSquareWarning } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { markAttendanceAction, sendAbsenceAlertAction } from '@/lib/actions/attendance';
import { fetchClassRoster, type RosterStatus, type RosterStudent } from '@/lib/attendance/class-roster';
import { lateCutoffLabel } from '@/lib/attendance/late-policy';

const STATUS_TONE = { unmarked: 'neutral', present: 'success', absent: 'danger', late: 'warning' } as const;
// Same cycle as the web class view: a tap flips between present and absent
// (late/unmarked go to present first).
const NEXT_STATUS: Record<RosterStatus, 'present' | 'absent'> = { unmarked: 'present', present: 'absent', absent: 'present', late: 'present' };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// One class's roster for today, in roll-number order — the list never
// re-sorts while you mark, so you can work straight down it. Tap a status to
// mark (an absence also alerts the parent's portal); absent students show
// their alert status with Send / Resend.
export default function ClassDetailScreen() {
  const { grade, section } = useLocalSearchParams<{ grade: string; section: string }>();
  const theme = useTheme();
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [alertPending, setAlertPending] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    fetchClassRoster(grade, section).then((result) => {
      if (!mounted) return;
      if (!result.ok) { setError(result.error); return; }
      setRoster(result.roster);
    });
    return () => { mounted = false; };
  }, [grade, section]);

  function patchStudent(id: string, patch: Partial<RosterStudent>) {
    setRoster((prev) => (prev ? prev.map((s) => (s.id === id ? { ...s, ...patch } : s)) : prev));
  }

  async function cycleStatus(student: RosterStudent) {
    if (pending[student.id]) return;
    const previous = student.status;
    const status = NEXT_STATUS[previous];
    setPending((p) => ({ ...p, [student.id]: true }));
    patchStudent(student.id, { status });

    const outcome = await markAttendanceAction({ studentId: student.id, studentName: student.name, status });
    setPending((p) => ({ ...p, [student.id]: false }));
    if (!outcome.ok) { patchStudent(student.id, { status: previous }); return; }
    if (status === 'absent' && outcome.notified) patchStudent(student.id, { alertStatus: 'sent' });
  }

  async function sendAlert(student: RosterStudent) {
    if (alertPending[student.id]) return;
    setAlertPending((p) => ({ ...p, [student.id]: true }));
    const outcome = await sendAbsenceAlertAction({ studentId: student.id, studentName: student.name, classDate: today() });
    setAlertPending((p) => ({ ...p, [student.id]: false }));
    if (outcome.ok && outcome.notified > 0) patchStudent(student.id, { alertStatus: outcome.sent ? 'sent' : 'failed' });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title={`Grade ${grade} · Section ${section}`} subtitle={`Today · Late: ${lateCutoffLabel(grade, section)}`} onBack={() => router.back()} />
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
            {roster.length === 0 ? (
              <ThemedText color="textSecondary">No students in this class.</ThemedText>
            ) : (
              roster.map((s) => (
                <Card key={s.id} style={{ gap: 8 }}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="small">{s.name}</ThemedText>
                      <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{s.roll}</ThemedText>
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
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  alertBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md },
});
