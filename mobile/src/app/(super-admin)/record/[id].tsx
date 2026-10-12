import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Spacing } from '@/constants/theme';
import { getMobileApi } from '@/lib/api/client';
import { gradeTone } from '@/lib/marks/letter-grade';

type Day = { date: string; status: 'present' | 'absent' | 'late' };
type Mark = { id: string; date: string; subject: string; title: string; score: number; max: number; pct: number; grade: string };
type Record = {
  student: { id: string; fullName: string; rollNumber: string; grNumber: string | null; registrationNumber: string; grade: string; section: string; program: string; stream: string | null; status: string; enrollmentDate: string; address: string | null; guardianProfession: string | null; previousSchool: string | null; lastQualification: string | null };
  parents: { name: string; email: string; phone: string; secondaryPhone: string | null }[];
  subjects: { id: string; name: string }[];
  attendance: { days: Day[]; summary: { present: number; absent: number; late: number; total: number; pct: number | null } };
  marks: Mark[];
  marksSummary: { average: number | null; grade: string | null; bySubject: { subject: string; average: number; grade: string }[] };
  fees: { year: number; month: number; status: string }[];
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthKey = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const DAY_TONE = { present: 'success', late: 'warning', absent: 'danger' } as const;

function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const i of items) map.set(key(i), [...(map.get(key(i)) ?? []), i]);
  return Array.from(map);
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <View style={{ marginBottom: Spacing.two }}>
      <ThemedText variant="label" color="textMuted">{label}</ThemedText>
      <ThemedText>{value || '—'}</ThemedText>
    </View>
  );
}

export default function StudentRecordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [record, setRecord] = useState<Record | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await getMobileApi<{ record: Record }>(`/api/mobile/students/${id}/record`);
      if (cancelled) return;
      if (res.ok) setRecord(res.record); else setError(res.error);
    })();
    return () => { cancelled = true; };
  }, [id]);

  const s = record?.student;
  const attByMonth = record ? groupBy(record.attendance.days, (d) => monthKey(d.date)) : [];
  const marksByMonth = record ? groupBy(record.marks, (m) => monthKey(m.date)) : [];

  return (
    <ThemedView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <ScreenHeader title={s?.fullName ?? 'Student record'} subtitle={s ? `GR ${s.grNumber ?? '—'} · Roll ${s.rollNumber} · ${s.grade}-${s.section}` : undefined} onBack={() => router.back()} />
        </View>
        {error && <View style={styles.centered}><ThemedText color="textSecondary">{error}</ThemedText></View>}
        {!record && !error && <View style={styles.centered}><ActivityIndicator /></View>}
        {record && s && (
          <ScrollView contentContainerStyle={styles.content}>
            <Card>
              <ThemedText variant="bodyMedium" style={{ marginBottom: Spacing.two }}>Profile</ThemedText>
              <Field label="Programme" value={s.program} />
              <Field label="Stream" value={s.stream} />
              <Field label="Status" value={s.status} />
              <Field label="Enrolled" value={fmtDate(s.enrollmentDate)} />
              <Field label="Registration no." value={s.registrationNumber} />
              <Field label="Address" value={s.address} />
              <Field label="Guardian profession" value={s.guardianProfession} />
              <Field label="Previous school" value={s.previousSchool} />
              <Field label="Last qualification" value={s.lastQualification} />
            </Card>

            <Card>
              <ThemedText variant="bodyMedium" style={{ marginBottom: Spacing.two }}>Parents</ThemedText>
              {record.parents.length === 0 && <ThemedText color="textSecondary">No parent account linked.</ThemedText>}
              {record.parents.map((p) => (
                <View key={p.email} style={{ marginBottom: Spacing.two }}>
                  <ThemedText>{p.name}</ThemedText>
                  <ThemedText variant="mono" color="textMuted" selectable style={{ fontSize: 12 }}>{p.email}</ThemedText>
                  <ThemedText variant="mono" color="textMuted" selectable style={{ fontSize: 12 }}>{p.phone}{p.secondaryPhone ? ` · ${p.secondaryPhone}` : ''}</ThemedText>
                </View>
              ))}
            </Card>

            <Card>
              <ThemedText variant="bodyMedium" style={{ marginBottom: Spacing.two }}>Subjects</ThemedText>
              <ThemedText color="textSecondary">{record.subjects.length ? record.subjects.map((x) => x.name).join(' · ') : 'No subjects on file.'}</ThemedText>
            </Card>

            <Card>
              <ThemedText variant="bodyMedium">Attendance — {record.attendance.summary.total} days</ThemedText>
              <View style={styles.wrapRow}>
                <StatusPill tone="success" label={`Present ${record.attendance.summary.present}`} />
                <StatusPill tone="warning" label={`Late ${record.attendance.summary.late}`} />
                <StatusPill tone="danger" label={`Absent ${record.attendance.summary.absent}`} />
                <StatusPill tone="ink" label={record.attendance.summary.pct === null ? '—' : `${record.attendance.summary.pct}%`} />
              </View>
              {attByMonth.length === 0 && <ThemedText color="textSecondary">No attendance recorded yet.</ThemedText>}
              {attByMonth.map(([month, days]) => (
                <View key={month} style={{ marginTop: Spacing.three }}>
                  <ThemedText variant="label" color="textMuted">{month} · {days.filter((d) => d.status !== 'absent').length}/{days.length} attended</ThemedText>
                  <View style={styles.wrapRow}>
                    {days.map((d) => <StatusPill key={d.date} tone={DAY_TONE[d.status]} label={`${d.date.slice(8)} ${d.status[0].toUpperCase()}`} />)}
                  </View>
                </View>
              ))}
            </Card>

            <Card>
              <ThemedText variant="bodyMedium">
                Marks — {record.marks.length} results{record.marksSummary.average !== null ? ` · avg ${record.marksSummary.average}% (${record.marksSummary.grade})` : ''}
              </ThemedText>
              <View style={styles.wrapRow}>
                {record.marksSummary.bySubject.map((b) => <StatusPill key={b.subject} tone={gradeTone(b.grade)} label={`${b.subject} ${b.average}% ${b.grade}`} />)}
              </View>
              {marksByMonth.length === 0 && <ThemedText color="textSecondary">No marks recorded yet.</ThemedText>}
              {marksByMonth.map(([month, rows]) => (
                <View key={month} style={{ marginTop: Spacing.three }}>
                  <ThemedText variant="label" color="textMuted">{month}</ThemedText>
                  {rows.map((m) => (
                    <View key={m.id} style={styles.markRow}>
                      <View style={{ flex: 1 }}>
                        <ThemedText>{m.subject}</ThemedText>
                        <ThemedText variant="small" color="textMuted">{fmtDate(m.date)} · {m.title}</ThemedText>
                      </View>
                      <ThemedText variant="mono">{m.score}/{m.max}</ThemedText>
                      <StatusPill tone={gradeTone(m.grade)} label={m.grade} />
                    </View>
                  ))}
                </View>
              ))}
            </Card>

            <Card>
              <ThemedText variant="bodyMedium">Fee history</ThemedText>
              <View style={styles.wrapRow}>
                {record.fees.length === 0 && <ThemedText color="textSecondary">No fee records.</ThemedText>}
                {record.fees.map((f) => <StatusPill key={`${f.year}-${f.month}`} tone={f.status === 'paid' ? 'success' : 'danger'} label={`${MONTHS[f.month - 1].slice(0, 3)} ${f.year}`} />)}
              </View>
            </Card>
          </ScrollView>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  content: { padding: Spacing.four, gap: Spacing.three },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.two },
  markRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
});
