import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createNoticeAction, setNoticePublishedAction, updateNoticeAction } from '@/lib/actions/notices';
import { fetchAllNoticesForAdmin } from '@/lib/notices/fetch';
import { CATEGORY_TONE, type Notice, type NoticeAudience, type NoticeCategory } from '@/lib/notices/types';

const CATEGORIES: NoticeCategory[] = ['Academic', 'Event', 'Holiday', 'Admissions'];
const AUDIENCES: NoticeAudience[] = ['All', 'Students', 'Parents', 'Staff'];
const emptyForm = { id: '', title: '', body: '', category: CATEGORIES[0], audience: AUDIENCES[0] };

export default function SuperAdminNoticesScreen() {
  const theme = useTheme();
  const [notices, setNotices] = useState<Notice[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    fetchAllNoticesForAdmin().then(setNotices);
  }

  useEffect(load, []);

  function openCreate() {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(n: Notice) {
    setForm({ id: n.id, title: n.title, body: n.body, category: n.category, audience: n.audience });
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const input = { title: form.title, body: form.body, category: form.category, audience: form.audience };
    const result = form.id ? await updateNoticeAction({ ...input, id: form.id }) : await createNoticeAction(input);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    setModalOpen(false);
    load();
  }

  async function togglePublished(n: Notice) {
    await setNoticePublishedAction({ id: n.id, published: !n.published });
    load();
  }

  if (!notices) {
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
          <View style={{ flex: 1 }}>
            <ThemedText variant="title">Notices</ThemedText>
            <ThemedText variant="small" color="textSecondary">{notices.length} total</ThemedText>
          </View>
          <Button label="New" variant="secondary" size="sm" onPress={openCreate} />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {notices.length === 0 ? (
            <ThemedText color="textSecondary">No notices yet.</ThemedText>
          ) : (
            notices.map((n) => (
              <Card key={n.id} style={{ gap: 8 }}>
                <Pressable onPress={() => openEdit(n)} style={{ gap: 6 }}>
                  <View style={styles.rowBetween}>
                    <StatusPill tone={CATEGORY_TONE[n.category]} label={n.category} />
                    <ThemedText variant="small" color="textMuted">{n.published_at}</ThemedText>
                  </View>
                  <ThemedText variant="bodyMedium">{n.title}</ThemedText>
                  <ThemedText variant="small" color="textSecondary" numberOfLines={2}>{n.body}</ThemedText>
                </Pressable>
                <View style={styles.rowBetween}>
                  <ThemedText variant="small" color="textMuted">Audience: {n.audience}</ThemedText>
                  <Pressable onPress={() => togglePublished(n)}>
                    <ThemedText variant="small" style={{ color: theme.accent }}>{n.published ? 'Unpublish' : 'Publish'}</ThemedText>
                  </Pressable>
                </View>
              </Card>
            ))
          )}
        </ScrollView>

        <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
          <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <ThemedText variant="title" style={{ fontSize: 20 }}>{form.id ? 'Edit notice' : 'New notice'}</ThemedText>
                <Pressable onPress={() => setModalOpen(false)}><ThemedText style={{ color: theme.accent }}>Close</ThemedText></Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent}>
                {!!error && <ThemedText variant="small" style={{ color: Semantic.danger }}>{error}</ThemedText>}
                <TextField label="Title" value={form.title} onChangeText={(v) => setForm((f) => ({ ...f, title: v }))} />
                <TextField label="Body" value={form.body} onChangeText={(v) => setForm((f) => ({ ...f, body: v }))} multiline numberOfLines={4} style={{ minHeight: 90, textAlignVertical: 'top' }} />
                <ChipSelect label="Category" options={CATEGORIES} value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} />
                <ChipSelect label="Audience" options={AUDIENCES} value={form.audience} onChange={(v) => setForm((f) => ({ ...f, audience: v }))} />
                <Button label={saving ? 'Saving…' : 'Save'} loading={saving} disabled={!form.title || !form.body} onPress={handleSave} fullWidth />
              </ScrollView>
            </SafeAreaView>
          </ThemedView>
        </Modal>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, paddingBottom: Spacing.two, gap: Spacing.three },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four },
  modalContent: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three },
});
