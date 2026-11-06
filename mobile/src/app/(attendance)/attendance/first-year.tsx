import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { monthTitle, shiftMonth } from '@/lib/attendance/month';
import { CheckCircle2, CircleMinus, Clock3, XCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { submitClassAttendanceAction } from '@/lib/actions/attendance';
import {
  FACULTIES, FIRST_YEAR_GRADE, FIRST_YEAR_SECTIONS, YEAR_LABEL, subjectsForFaculty, type Faculty, type SubjectGrade,
} from '@/lib/attendance/first-year-subjects';
import { fetchSubjectRoster, type SubjectRoster } from '@/lib/attendance/subject-roster';

type Status = 'present' | 'absent' | 'late' | 'leave';

const STATUS_CONFIG: Record<Status, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  present: { label: 'Present', icon: CheckCircle2, color: Semantic.success, bg: Semantic.successBg },
  absent: { label: 'Absent', icon: XCircle, color: Semantic.danger, bg: Semantic.dangerBg },
  late: { label: 'Late', icon: Clock3, color: Semantic.warning, bg: Semantic.warningBg },
  leave: { label: 'Leave', icon: CircleMinus, color: Ink[700], bg: Ink[100] },
};
const STATUSES: Status[] = ['present', 'absent', 'late', 'leave'];

const INITIALS = (name: string) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}
function dayLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
function longLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, { borderColor: active ? Ink[600] : theme.border, backgroundColor: active ? Ink[50] : theme.surface }]}>
      <ThemedText variant="small" style={active ? { color: Ink[700] } : undefined}>{label}</ThemedText>
    </Pressable>
  );
}

// First and Second Year attend by faculty and subject, not for a fixed full day: pick the
// class, the date, the faculty and the subject, and only the students who study
// that subject are listed (Physics → every faculty, Biology → Pre-Medical only…).
export function SubjectAttendanceScreen({ grade }: { grade: SubjectGrade }) {
  const theme = useTheme();
  const yearLabel = YEAR_LABEL[grade];
  const params = useLocalSearchParams<{ section?: string }>();
  const [section, setSection] = useState<string>(FIRST_YEAR_SECTIONS.find((s) => s === params.section) ?? 'A');
  const [classDate, setClassDate] = useState(isoDaysAgo(0));
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [subject, setSubject] = useState('');
  const [roster, setRoster] = useState<SubjectRoster | null>(null);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<Record<string, Status>>({});
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => isoDaysAgo(i)), []);
  const subjects = subjectsForFaculty(faculty, grade);

  const load = useCallback(async () => {
    if (!subject) { setRoster(null); return; }
    setLoading(true);
    try {
      const data = await fetchSubjectRoster({ grade, section, classDate, subject, faculty });
      setRoster(data);
      setRecords(Object.fromEntries(data.students.map((s) => [s.id, s.status === 'unmarked' ? 'present' : s.status])));
      setDirty(false);
    } catch {
      setRoster(null);
      setMessage({ text: 'Could not load the class. Check your connection and try again.', error: true });
    } finally {
      setLoading(false);
    }
  }, [grade, section, classDate, subject, faculty]);

  useEffect(() => { void load(); }, [load]);

  function pickFaculty(next: Faculty | null) {
    setFaculty(next);
    // A faculty change can leave a subject that faculty doesn't study — drop it.
    if (subject && !subjectsForFaculty(next, grade).includes(subject)) setSubject('');
    setMessage(null);
  }

  function setStatus(id: string, status: Status) {
    setRecords((prev) => ({ ...prev, [id]: status }));
    setDirty(true);
    setMessage(null);
  }

  const students = roster?.students ?? [];
  const alreadyMarked = students.some((s) => s.status !== 'unmarked');
  const counts = {
    present: students.filter((s) => records[s.id] === 'present').length,
    absent: students.filter((s) => records[s.id] === 'absent').length,
    late: students.filter((s) => records[s.id] === 'late').length,
    leave: students.filter((s) => records[s.id] === 'leave').length,
  };

  async function handleSubmit() {
    setSubmitting(true);
    setMessage(null);
    const result = await submitClassAttendanceAction({
      classDate,
      subject,
      classLabel: `${yearLabel} ${section}`,
      records: students.map((s) => ({ studentId: s.id, studentName: s.name, status: records[s.id] })),
    });
    setSubmitting(false);
    if (!result.ok) { setMessage({ text: result.error, error: true }); return; }
    setMessage({
      text: result.notifiedCount > 0 ? `Saved. ${result.notifiedCount} absence notice${result.notifiedCount > 1 ? 's' : ''} sent to parents.` : 'Saved.',
      error: false,
    });
    await load();
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View>
            <ThemedText variant="title" style={{ fontSize: 20, lineHeight: 26 }}>{yearLabel} · By subject</ThemedText>
            <ThemedText variant="small" color="textSecondary">Only students who study the subject are listed</ThemedText>
            <Pressable onPress={() => router.push(`/class/${grade}/${section}` as Href)} accessibilityRole="button" style={{ marginTop: 6 }}>
              <ThemedText variant="small" style={{ color: Ink[700] }}>Mark whole day (one by one) instead →</ThemedText>
            </Pressable>
          </View>

          <Card style={{ gap: Spacing.three }}>
            <View style={{ gap: 6 }}>
              <ThemedText variant="label" color="textSecondary">1 · CLASS</ThemedText>
              <View style={styles.row}>
                {FIRST_YEAR_SECTIONS.map((s) => <Chip key={s} label={`${yearLabel} ${s}`} active={s === section} onPress={() => setSection(s)} />)}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <ThemedText variant="label" color="textSecondary">2 · DATE AND DAY</ThemedText>
              <View style={styles.monthRow}>
                <Pressable onPress={() => setClassDate(shiftMonth(classDate, -1, isoDaysAgo(0)))} accessibilityRole="button" accessibilityLabel="Previous month" hitSlop={8}>
                  <ThemedText variant="small" style={{ color: Ink[700] }}>‹ Prev</ThemedText>
                </Pressable>
                <ThemedText variant="small">{monthTitle(classDate)}</ThemedText>
                <Pressable onPress={() => setClassDate(shiftMonth(classDate, 1, isoDaysAgo(0)))} accessibilityRole="button" accessibilityLabel="Next month" hitSlop={8} disabled={classDate >= isoDaysAgo(0)}>
                  <ThemedText variant="small" style={{ color: classDate >= isoDaysAgo(0) ? '#B5AEA6' : Ink[700] }}>Next ›</ThemedText>
                </Pressable>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
                {dates.map((d) => <Chip key={d} label={dayLabel(d)} active={d === classDate} onPress={() => setClassDate(d)} />)}
              </ScrollView>
              <ThemedText variant="small" color="textMuted">{longLabel(classDate)}</ThemedText>
            </View>

            <View style={{ gap: 6 }}>
              <ThemedText variant="label" color="textSecondary">3 · FACULTY</ThemedText>
              <View style={styles.row}>
                <Chip label="All faculties" active={faculty === null} onPress={() => pickFaculty(null)} />
                {FACULTIES.map((f) => <Chip key={f} label={f} active={f === faculty} onPress={() => pickFaculty(f)} />)}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <ThemedText variant="label" color="textSecondary">4 · SUBJECT</ThemedText>
              <View style={styles.row}>
                {subjects.map((s) => <Chip key={s} label={s} active={s === subject} onPress={() => { setSubject(s); setMessage(null); }} />)}
              </View>
            </View>
          </Card>

          {!subject ? (
            <Card><ThemedText variant="small" color="textSecondary" style={{ textAlign: 'center' }}>Choose a subject to see the students.</ThemedText></Card>
          ) : loading ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: Spacing.three }} />
          ) : (
            <>
              <View>
                <ThemedText variant="bodyMedium">{yearLabel} {section} · {subject}{faculty ? ` · ${faculty}` : ''}</ThemedText>
                <ThemedText variant="small" color="textSecondary">
                  {students.length} student{students.length === 1 ? '' : 's'}{alreadyMarked ? ' · already marked — changes update the saved record' : ''}
                </ThemedText>
              </View>

              {roster && roster.unplaced > 0 && (
                <View style={[styles.notice, { backgroundColor: Semantic.warningBg }]}>
                  <ThemedText variant="small" style={{ color: Semantic.warning }}>
                    {roster.unplaced} student{roster.unplaced === 1 ? ' has' : 's have'} no faculty set, so they cannot be listed for {subject}. Set the faculty on their student record.
                  </ThemedText>
                </View>
              )}

              {students.length === 0 ? (
                <Card><ThemedText variant="small" color="textSecondary" style={{ textAlign: 'center' }}>No students in {yearLabel} {section} study {subject}{faculty ? ` in ${faculty}` : ''}.</ThemedText></Card>
              ) : (
                <>
                  <View style={styles.summaryRow}>
                    {STATUSES.map((s) => (
                      <ThemedText key={s} variant="small" style={{ color: STATUS_CONFIG[s].color }}>{counts[s]} {STATUS_CONFIG[s].label}</ThemedText>
                    ))}
                    <Pressable
                      onPress={() => { setRecords(Object.fromEntries(students.map((s) => [s.id, 'present' as Status]))); setDirty(true); }}
                      style={[styles.allPresentBtn, { backgroundColor: Semantic.successBg }]}>
                      <ThemedText variant="small" style={{ color: Semantic.success }}>All Present</ThemedText>
                    </Pressable>
                  </View>

                  {students.map((s) => (
                    <Card key={s.id} style={styles.studentRow}>
                      <View style={[styles.avatar, { backgroundColor: Ink[100] }]}>
                        <ThemedText variant="mono" style={{ fontSize: 11, color: Ink[700] }}>{INITIALS(s.name)}</ThemedText>
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText variant="small" numberOfLines={1}>{s.name}</ThemedText>
                        <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }} numberOfLines={1}>{s.gr ?? s.roll}{s.stream ? ` · ${s.stream}` : ''}</ThemedText>
                      </View>
                      <View style={styles.statusButtons}>
                        {STATUSES.map((status) => {
                          const cfg = STATUS_CONFIG[status];
                          const Icon = cfg.icon;
                          const active = records[s.id] === status;
                          return (
                            <Pressable
                              key={status}
                              onPress={() => setStatus(s.id, status)}
                              accessibilityRole="button"
                              accessibilityLabel={`Mark ${s.name} ${cfg.label}`}
                              accessibilityState={{ selected: active }}
                              style={[styles.statusBtn, { backgroundColor: active ? cfg.color : cfg.bg }]}>
                              <Icon size={14} color={active ? '#FFFFFF' : cfg.color} strokeWidth={2.5} />
                            </Pressable>
                          );
                        })}
                      </View>
                    </Card>
                  ))}

                  {message && (
                    <ThemedText variant="small" style={{ color: message.error ? Semantic.danger : Semantic.success, textAlign: 'center' }}>{message.text}</ThemedText>
                  )}
                  <Button
                    label={submitting ? 'Saving…' : alreadyMarked ? 'Update Attendance' : 'Submit Attendance'}
                    loading={submitting}
                    disabled={!dirty && alreadyMarked}
                    onPress={handleSubmit}
                    fullWidth
                  />
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, paddingBottom: Spacing.five },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
  notice: { borderRadius: Radius.md, padding: Spacing.three },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  allPresentBtn: { marginLeft: 'auto', borderRadius: Radius.md, paddingVertical: 6, paddingHorizontal: 10 },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  statusButtons: { flexDirection: 'row', gap: 6 },
  statusBtn: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
});

export default function FirstYearAttendanceScreen() {
  return <SubjectAttendanceScreen grade={FIRST_YEAR_GRADE} />;
}
