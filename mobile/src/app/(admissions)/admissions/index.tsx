import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { GraduationCap, Inbox } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/auth-context';
import { useAsyncData } from '@/lib/use-async-data';
import { fetchAdmissionsDashboardData } from '@/lib/admissions/fetch';
import { STATUS_TONE } from '@/lib/admissions/enquiry-types';

export default function AdmissionsDashboard() {
  const theme = useTheme();
  const { profile, signOut } = useAuth();
  const state = useAsyncData(fetchAdmissionsDashboardData, []);

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
              <ThemedText variant="title">Admissions</ThemedText>
              {profile && <ThemedText variant="small" color="textSecondary">{profile.fullName}</ThemedText>}
            </View>
            <Pressable onPress={signOut} hitSlop={8}>
              <ThemedText variant="small" style={{ color: theme.accent }}>Log out</ThemedText>
            </Pressable>
          </View>

          <View style={styles.row}>
            <StatCard icon={GraduationCap} label="Enrolled students" value={String(data.totalEnrolled)} />
            <StatCard icon={Inbox} label="Pending enquiries" value={String(data.pendingEnquiries)} />
          </View>

          <Button label="Enrol Student" onPress={() => router.push('/students/new')} fullWidth />

          <View style={{ gap: Spacing.two }}>
            <ThemedText variant="subtitle">Recent enquiries</ThemedText>
            {data.recentEnquiries.length === 0 ? (
              <ThemedText color="textSecondary">No enquiries yet.</ThemedText>
            ) : (
              data.recentEnquiries.map((e) => (
                <Card key={e.id} style={{ gap: 6 }}>
                  <View style={styles.enquiryHeader}>
                    <ThemedText variant="bodyMedium">{e.parent_name}</ThemedText>
                    <StatusPill tone={STATUS_TONE[e.status]} label={e.status} />
                  </View>
                  <ThemedText variant="small" color="textSecondary">
                    Grade {e.grade_interest} interest · {e.received_at}
                  </ThemedText>
                </Card>
              ))
            )}
          </View>
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
  enquiryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
