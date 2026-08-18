import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2 } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createTeacherAction, deleteTeacherAction, updateTeacherAction } from '@/lib/actions/teachers';
import { fetchTeachers, type Teacher } from '@/lib/teachers/fetch';

const emptyForm = { id: '', fullName: '', subject: '', classes: '', email: '', phone: '' };

export default function SuperAdminTeachersScreen() {
  const theme = useTheme();
  const [teachers, setTeachers] = useState<Teacher[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    fetchTeachers().then(setTeachers);
  }

  useEffect(load, []);

  function openCreate() {
    setForm(emptyForm);
    setError('');
    setModalOpen(true);
  }

  function openEdit(t: Teacher) {
    setForm({ id: t.id, fullName: t.full_name, subject: t.subject, classes: t.classes.join(', '), email: t.email ?? '', phone: t.phone ?? '' });
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const input = {
      fullName: form.fullName,
      subject: form.subject,
      classes: form.classes.split(',').map((c) => c.trim()).filter(Boolean),
      email: form.email || undefined,
      phone: form.phone || undefined,
    };
    const result = form.id ? await updateTeacherAction({ ...input, id: form.id }) : await createTeacherAction(input);
    setSaving(false);
    if (!result.ok) { setError(result.error); return; }
    setModalOpen(false);
    load();
  }

  function confirmDelete(t: Teacher) {
    Alert.alert('Remove teacher', `Remove ${t.full_name}? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteTeacherAction({ id: t.id }); load(); } },
    ]);
  }

  if (!teachers) {
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
            <ThemedText variant="title">Teachers</ThemedText>
            <ThemedText variant="small" color="textSecondary">{teachers.length} on record</ThemedText>
          </View>
          <Button label="Add" variant="secondary" size="sm" onPress={openCreate} />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {teachers.length === 0 ? (
            <ThemedText color="textSecondary">No teachers yet.</ThemedText>
          ) : (
            teachers.map((t) => (
              <Pressable key={t.id} onPress={() => openEdit(t)}>
                <Card style={styles.row}>
                  <Avatar name={t.full_name} size={36} />
                  <View style={{ flex: 1 }}>
                    <ThemedText variant="small">{t.full_name}</ThemedText>
                    <ThemedText variant="small" color="textMuted">{t.subject} · {t.classes.join(', ') || 'No classes'}</ThemedText>
                  </View>
                  <Pressable
                    onPress={() => confirmDelete(t)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${t.full_name}`}>
                    <Trash2 size={16} color={theme.textMuted} />
                  </Pressable>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>

        <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
          <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <ThemedText variant="title" style={{ fontSize: 20 }}>{form.id ? 'Edit teacher' : 'Add teacher'}</ThemedText>
                <Pressable onPress={() => setModalOpen(false)}><ThemedText style={{ color: theme.accent }}>Close</ThemedText></Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent}>
                {!!error && <ThemedText variant="small" style={{ color: Semantic.danger }}>{error}</ThemedText>}
                <TextField label="Full name" value={form.fullName} onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))} />
                <TextField label="Subject" value={form.subject} onChangeText={(v) => setForm((f) => ({ ...f, subject: v }))} />
                <TextField label="Classes (comma-separated)" placeholder="9-A, 10-B" value={form.classes} onChangeText={(v) => setForm((f) => ({ ...f, classes: v }))} />
                <TextField label="Email (optional)" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} autoCapitalize="none" keyboardType="email-address" />
                <TextField label="Phone (optional)" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
                <Button label={saving ? 'Saving…' : 'Save'} loading={saving} disabled={!form.fullName || !form.subject} onPress={handleSave} fullWidth />
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
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.two, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four },
  modalContent: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three },
});
