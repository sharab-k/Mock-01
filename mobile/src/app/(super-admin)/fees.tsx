import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, CircleCheck, CircleX, DollarSign } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { StatCard } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchFeeRoster, setFeeStatusAction, type FeeRosterRow } from '@/lib/fees/fetch';
import { GRADES } from '@/lib/students/constants';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function FeesScreen() {
  const theme = useTheme();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [students, setStudents] = useState<FeeRosterRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchFeeRoster(year, month).then((result) => {
      if (!mounted) return;
      if (!result.ok) { setError(result.error); return; }
      setStudents(result.students);
    });
    return () => { mounted = false; };
  }, [year, month]);

  function goToMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    setStudents(null);
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
  }

  const filtered = useMemo(() => {
    if (!students) return [];
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const matchesQuery = !q || s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q) || (s.gr_number ?? '').toLowerCase().includes(q);
      const matchesGrade = gradeFilter === 'All' || s.grade === gradeFilter;
      const matchesStatus = statusFilter === 'All' || (statusFilter === 'Paid' ? s.status === 'paid' : s.status === 'unpaid');
      return matchesQuery && matchesGrade && matchesStatus;
    });
  }, [students, query, gradeFilter, statusFilter]);

  const paidCount = students?.filter((s) => s.status === 'paid').length ?? 0;
  const total = students?.length ?? 0;
  const collectionPct = total > 0 ? Math.round((paidCount / total) * 100) : 0;

  async function toggleStatus(s: FeeRosterRow) {
    const nextStatus = s.status === 'paid' ? 'unpaid' : 'paid';
    setPendingId(s.id);
    setStudents((prev) => prev?.map((p) => p.id === s.id ? { ...p, status: nextStatus } : p) ?? null);
    const outcome = await setFeeStatusAction({ studentId: s.id, studentName: s.full_name, year, month, status: nextStatus });
    setPendingId(null);
    if (!outcome.ok) {
      setStudents((prev) => prev?.map((p) => p.id === s.id ? { ...p, status: s.status } : p) ?? null);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Fees" subtitle="Monthly fee status — Super Admin only" onBack={() => router.back()} />
        </View>

        <View style={styles.monthNav}>
          <Pressable onPress={() => goToMonth(-1)} hitSlop={10}><ChevronLeft size={20} color={theme.textSecondary} /></Pressable>
          <ThemedText variant="mono" style={{ fontSize: 15 }}>{MONTH_NAMES[month - 1]} {year}</ThemedText>
          <Pressable onPress={() => goToMonth(1)} hitSlop={10}><ChevronRight size={20} color={theme.textSecondary} /></Pressable>
        </View>

        {error && <View style={styles.centered}><ThemedText color="textSecondary">{error}</ThemedText></View>}
        {!error && !students && <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>}

        {students && (
          <ScrollView contentContainerStyle={styles.list}>
            <View style={styles.statsRow}>
              <StatCard icon={CircleCheck} label="Fees Paid" value={String(paidCount)} />
              <StatCard icon={CircleX} label="Fees Unpaid" value={String(total - paidCount)} />
              <StatCard icon={DollarSign} label="Collection" value={`${collectionPct}%`} />
            </View>

            <TextField placeholder="Search by name, roll, or G.R. no…" value={query} onChangeText={setQuery} autoCapitalize="none" />
            <ChipSelect label="Grade" options={['All', ...GRADES] as const} value={gradeFilter} onChange={setGradeFilter} />
            <ChipSelect label="Status" options={['All', 'Paid', 'Unpaid'] as const} value={statusFilter} onChange={setStatusFilter} />

            {filtered.length === 0 && (
              <ThemedText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.four }}>No students match this filter.</ThemedText>
            )}
            {filtered.filter(Boolean).map((s) => (
              <Card key={s.id} style={{ gap: Spacing.two }}>
                <View style={styles.row}>
                  <Avatar name={s.full_name} size={32} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="small">{s.full_name}</ThemedText>
                    <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>
                      {s.roll_number}{s.gr_number ? ` · GR ${s.gr_number}` : ''} · {s.grade}{s.section}
                    </ThemedText>
                  </View>
                  <StatusPill tone={s.status === 'paid' ? 'success' : 'danger'} label={s.status === 'paid' ? 'Paid' : 'Unpaid'} />
                </View>
                <Pressable
                  onPress={() => toggleStatus(s)}
                  disabled={pendingId === s.id}
                  style={[
                    styles.toggleBtn,
                    { backgroundColor: s.status === 'paid' ? Semantic.dangerBg : Semantic.successBg, opacity: pendingId === s.id ? 0.6 : 1 },
                  ]}>
                  <ThemedText variant="small" style={{ color: s.status === 'paid' ? Semantic.danger : Semantic.success, fontWeight: '600' as const }}>
                    {pendingId === s.id ? 'Saving…' : s.status === 'paid' ? 'Mark Unpaid' : 'Mark Paid'}
                  </ThemedText>
                </Pressable>
              </Card>
            ))}
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
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.four, paddingBottom: Spacing.three },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  statsRow: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  toggleBtn: { alignItems: 'center', paddingVertical: 8, borderRadius: 10 },
});
