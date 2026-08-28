import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Phone, UserPlus } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { updateEnquiryStatusAction } from '@/lib/actions/enquiries';
import { STATUS_TO_DB } from '@/lib/admissions/enquiry-mapping';
import { fetchEnquiries } from '@/lib/admissions/fetch';
import { NEXT_STATUS, STATUS_TONE, type Enquiry, type EnquiryStatus } from '@/lib/admissions/enquiry-types';

const FILTERS: ('All' | EnquiryStatus)[] = ['All', 'Unread', 'Contacted', 'Awaiting Visit', 'Enrolled', 'Declined'];

export default function AdmissionsEnquiriesScreen() {
  const theme = useTheme();
  const [enquiries, setEnquiries] = useState<Enquiry[] | null>(null);
  const [filter, setFilter] = useState<'All' | EnquiryStatus>('All');

  useEffect(() => {
    let mounted = true;
    fetchEnquiries().then((data) => { if (mounted) setEnquiries(data); });
    return () => { mounted = false; };
  }, []);

  async function setStatus(id: string, status: EnquiryStatus) {
    if (!enquiries) return;
    const previous = enquiries;
    setEnquiries(enquiries.map((e) => (e.id === id ? { ...e, status } : e)));
    const result = await updateEnquiryStatusAction({ id, status: STATUS_TO_DB[status] });
    if (!result.ok) setEnquiries(previous);
  }

  const filtered = enquiries?.filter((e) => filter === 'All' || e.status === filter) ?? [];

  if (!enquiries) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText variant="title">Enquiries</ThemedText>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {FILTERS.map((f) => {
            const active = f === filter;
            return (
              <Pressable
                key={f}
                onPress={() => setFilter(f)}
                style={[styles.filterChip, { borderColor: active ? Ink[600] : theme.border, backgroundColor: active ? Ink[50] : theme.surface }]}>
                <ThemedText variant="small" style={active ? { color: Ink[700] } : undefined}>{f}</ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <ThemedText color="textSecondary">No enquiries match this filter.</ThemedText>
          ) : (
            filtered.map((e) => {
              const isTerminal = e.status === 'Enrolled' || e.status === 'Declined';
              return (
                <Card key={e.id} style={{ gap: 8 }}>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="bodyMedium">{e.parent_name}</ThemedText>
                    <StatusPill tone={STATUS_TONE[e.status]} label={e.status} />
                  </View>
                  <ThemedText variant="small" color="textSecondary">
                    Grade {e.grade_interest} · {e.program_interest} · {e.received_at}
                  </ThemedText>
                  {!!e.message && <ThemedText variant="small" color="textMuted" numberOfLines={2}>{e.message}</ThemedText>}

                  <View style={styles.actionsRow}>
                    <Pressable onPress={() => Linking.openURL(`tel:${e.parent_phone}`)} style={[styles.actionBtn, { borderColor: theme.border }]}>
                      <Phone size={12} color={Ink[600]} />
                      <ThemedText variant="small">Call</ThemedText>
                    </Pressable>
                    {!isTerminal && (
                      <Pressable onPress={() => setStatus(e.id, NEXT_STATUS[e.status])} style={[styles.actionBtn, { borderColor: theme.border }]}>
                        <ThemedText variant="small">Mark as {NEXT_STATUS[e.status]}</ThemedText>
                      </Pressable>
                    )}
                    {!isTerminal && (
                      <Pressable onPress={() => setStatus(e.id, 'Declined')} style={[styles.actionBtn, { borderColor: theme.border }]}>
                        <ThemedText variant="small" style={{ color: Semantic.danger }}>Decline</ThemedText>
                      </Pressable>
                    )}
                    <Pressable onPress={() => router.push('/students/new')} style={[styles.actionBtn, styles.enrolBtn]}>
                      <UserPlus size={12} color="#FFFFFF" />
                      <ThemedText variant="small" style={{ color: '#FFFFFF' }}>Enrol</ThemedText>
                    </Pressable>
                  </View>
                </Card>
              );
            })
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
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  filterRow: { gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  // flexShrink: 0 — see lectures/index.tsx's filterChip comment; without it
  // React Native Web shrinks these to fit instead of scrolling the row.
  filterChip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 6, paddingHorizontal: 12, flexShrink: 0 },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: Radius.md, paddingVertical: 7, paddingHorizontal: 10 },
  enrolBtn: { backgroundColor: Ink[700], borderColor: Ink[700], marginLeft: 'auto' },
});
