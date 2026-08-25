import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { AlertTriangle, ChevronRight, ShieldAlert, Users2, Wallet, UsersRound, GraduationCap } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { useAsyncData } from '@/lib/use-async-data';
import { supabase } from '@/lib/supabase/client';
import { fetchStaffDirectory, type StaffMember } from '@/lib/staff/fetch';
import { fetchAuditLog } from '@/lib/audit/fetch';
import { GRADES } from '@/lib/students/constants';

type DashboardData = {
  totalStudents: number;
  enrolledThisMonth: number;
  todaysAttendancePct: number | null;
  attendanceDelta: number | null;
  staffPreview: StaffMember[];
  subAdminCount: number;
  inactiveSubAdminCount: number;
  flaggedCount: number;
};

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function attendancePct(rows: { status: string }[]): number | null {
  if (rows.length === 0) return null;
  const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length;
  return Math.round((present / rows.length) * 100);
}

async function loadDashboard(): Promise<DashboardData> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [studentsRes, monthRes, todayRes, lastWeekRes, staffResult, auditResult] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null).eq('status', 'active'),
    supabase.from('students').select('id', { count: 'exact', head: true }).is('deleted_at', null).gte('created_at', startOfMonth.toISOString()),
    supabase.from('attendance_records').select('status').eq('class_date', isoDate(0)),
    supabase.from('attendance_records').select('status').eq('class_date', isoDate(-7)),
    fetchStaffDirectory(),
    fetchAuditLog(7),
  ]);

  if (!staffResult.ok) throw new Error(staffResult.error);
  if (!auditResult.ok) throw new Error(auditResult.error);

  const todaysPct = attendancePct(todayRes.data ?? []);
  const lastWeekPct = attendancePct(lastWeekRes.data ?? []);

  return {
    totalStudents: studentsRes.count ?? 0,
    enrolledThisMonth: monthRes.count ?? 0,
    todaysAttendancePct: todaysPct,
    attendanceDelta: todaysPct !== null && lastWeekPct !== null ? todaysPct - lastWeekPct : null,
    staffPreview: staffResult.staff.slice(0, 5),
    subAdminCount: staffResult.staff.length,
    inactiveSubAdminCount: staffResult.staff.filter((s) => s.status === 'Inactive').length,
    flaggedCount: auditResult.entries.filter((e) => e.flag).length,
  };
}

export default function SuperAdminDashboard() {
  const theme = useTheme();
  const { profile, signOut } = useAuth();
  const state = useAsyncData(loadDashboard, []);

  if (state.status === 'loading') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (state.status === 'error') {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ErrorState message={state.error} onRetry={state.reload} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const data = state.data;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="title">Super Admin</ThemedText>
              {profile && <ThemedText variant="small" color="textSecondary">{profile.fullName}</ThemedText>}
            </View>
            <Pressable onPress={signOut} hitSlop={8}>
              <ThemedText variant="small" style={{ color: theme.accent }}>Log out</ThemedText>
            </Pressable>
          </View>

          <View style={styles.row}>
            <StatCard icon={Users2} label="Total students" value={String(data.totalStudents)} delta={{ value: `+${data.enrolledThisMonth} this month`, direction: 'up' }} />
            <StatCard
              icon={AlertTriangle}
              label="Today's attendance"
              value={data.todaysAttendancePct !== null ? `${data.todaysAttendancePct}%` : '—'}
              delta={data.attendanceDelta !== null ? { value: `${data.attendanceDelta >= 0 ? '+' : ''}${data.attendanceDelta}%`, direction: data.attendanceDelta >= 0 ? 'up' : 'down' } : undefined}
            />
          </View>

          <Pressable onPress={() => router.push('/students')}>
            <Card style={styles.linkRow}>
              <GraduationCap size={18} color={theme.textMuted} />
              <ThemedText variant="bodyMedium" style={{ flex: 1 }}>Student Directory</ThemedText>
              <ChevronRight size={16} color={theme.textMuted} />
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/parents')}>
            <Card style={styles.linkRow}>
              <UsersRound size={18} color={theme.textMuted} />
              <ThemedText variant="bodyMedium" style={{ flex: 1 }}>Parent Directory</ThemedText>
              <ChevronRight size={16} color={theme.textMuted} />
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/fees')}>
            <Card style={styles.linkRow}>
              <Wallet size={18} color={theme.textMuted} />
              <ThemedText variant="bodyMedium" style={{ flex: 1 }}>Fees</ThemedText>
              <ChevronRight size={16} color={theme.textMuted} />
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/audit')}>
            <Card style={styles.linkRow}>
              <ShieldAlert size={18} color={data.flaggedCount > 0 ? Semantic.danger : theme.textMuted} />
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyMedium">Audit log</ThemedText>
                <ThemedText variant="small" color="textSecondary">
                  {data.flaggedCount > 0 ? `${data.flaggedCount} flagged actions recently` : 'No flagged actions recently'}
                </ThemedText>
              </View>
              <ChevronRight size={16} color={theme.textMuted} />
            </Card>
          </Pressable>

          <Pressable onPress={() => router.push('/settings')}>
            <Card style={styles.linkRow}>
              <ThemedText variant="bodyMedium" style={{ flex: 1 }}>System settings</ThemedText>
              <ChevronRight size={16} color={theme.textMuted} />
            </Card>
          </Pressable>

          <View style={{ gap: Spacing.two }}>
            <View style={styles.rowBetween}>
              <ThemedText variant="subtitle">Sub-admins</ThemedText>
              <ThemedText variant="small" color="textSecondary">
                {data.subAdminCount} total{data.inactiveSubAdminCount > 0 ? ` · ${data.inactiveSubAdminCount} inactive` : ''}
              </ThemedText>
            </View>
            {data.staffPreview.filter(Boolean).map((s) => (
              <Card key={s.id} style={styles.staffRow}>
                <Avatar name={s.name} size={32} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="small">{s.name}</ThemedText>
                  <ThemedText variant="small" color="textMuted">{s.role}</ThemedText>
                </View>
                <StatusPill tone={s.status === 'Active' ? 'success' : 'neutral'} label={s.status} />
              </Card>
            ))}
          </View>

          {GRADES.length > 0 && (
            <ThemedText variant="small" color="textMuted" style={{ textAlign: 'center' }}>
              Full class-by-class breakdown lives in the Attendance and Marks portals.
            </ThemedText>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: Spacing.three },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
