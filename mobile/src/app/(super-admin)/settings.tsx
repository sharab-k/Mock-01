import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { RoleColors, Spacing, type PortalRole } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ROLE_PERMISSIONS: { role: string; portalRole: PortalRole; access: string }[] = [
  { role: 'Super Admin', portalRole: 'super_admin', access: 'Full system access, manages sub-admins, full audit log' },
  { role: 'Admissions Admin', portalRole: 'admissions_admin', access: 'Create/delete students, issues parent credentials, enquiry inbox' },
  { role: 'Attendance Admin', portalRole: 'attendance_admin', access: 'Daily roster, single-click check-in, triggers absence alerts' },
  { role: 'Marks Admin', portalRole: 'marks_admin', access: 'Bulk mark entry, tier evaluation, logged edit history' },
  { role: 'Student', portalRole: 'student', access: 'View own lectures, assignments, marks, attendance' },
  { role: 'Parent', portalRole: 'parent', access: 'Read-only attendance, marks, and progress for linked children' },
];

// Fully static — matches the web's reference-only settings page. The
// Twilio-configured live check reads a server env var the mobile client
// has no access to, so it's dropped rather than adding a mediated route
// for one low-value boolean.
export default function SystemSettingsScreen() {
  const theme = useTheme();
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="System Settings" subtitle="Academy information and role permissions" onBack={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Card style={{ gap: 12 }}>
            <ThemedText variant="bodyMedium">Academy Information</ThemedText>
            <InfoRow label="Institution name" value="JE Academy" />
            <InfoRow label="Admissions email" value="admissions@jeacademy.edu.pk" mono />
            <InfoRow label="Academic year" value="2025–26, Term 2" />
          </Card>

          <Card style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
            <View style={{ padding: Spacing.four, paddingBottom: Spacing.two }}>
              <ThemedText variant="bodyMedium">Roles &amp; Permissions</ThemedText>
              <ThemedText variant="small" color="textMuted">Reference only — access is enforced at the database level via RLS</ThemedText>
            </View>
            {ROLE_PERMISSIONS.map((r, i) => (
              <View key={r.role} style={[styles.roleRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                <View style={[styles.dot, { backgroundColor: RoleColors[r.portalRole].fg }]} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="small">{r.role}</ThemedText>
                  <ThemedText variant="small" color="textMuted">{r.access}</ThemedText>
                </View>
              </View>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View>
      <ThemedText variant="label" color="textMuted">{label}</ThemedText>
      <ThemedText variant={mono ? 'mono' : 'small'}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.four, paddingBottom: Spacing.six },
  roleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: Spacing.four, paddingVertical: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
});
