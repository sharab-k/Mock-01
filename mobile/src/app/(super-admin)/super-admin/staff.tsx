import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Copy, KeyRound, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { SetPasswordModal } from '@/components/set-password-modal';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createStaffAction, setStaffActiveAction, setStaffPasswordAction } from '@/lib/actions/staff';
import { fetchStaffDirectory, type StaffMember } from '@/lib/staff/fetch';
import { STAFF_ROLES, STAFF_ROLE_LABEL, type StaffRole } from '@/lib/staff/roles';

const emptyForm = { fullName: '', email: '', phone: '', role: STAFF_ROLES[0] as StaffRole };

export default function SuperAdminStaffScreen() {
  const theme = useTheme();
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [issued, setIssued] = useState<{ email: string; tempPassword: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<StaffMember | null>(null);

  function load() {
    fetchStaffDirectory().then((result) => {
      if (!result.ok) { setError(result.error); return; }
      setStaff(result.staff);
    });
  }

  useEffect(load, []);

  async function handleCreate() {
    setSaving(true);
    setFormError('');
    const result = await createStaffAction(form);
    setSaving(false);
    if (!result.ok) { setFormError(result.error); return; }
    setModalOpen(false);
    setIssued({ email: result.email, tempPassword: result.tempPassword });
    setForm(emptyForm);
    load();
  }

  async function copyCredentials() {
    if (!issued) return;
    await Clipboard.setStringAsync(`Email: ${issued.email}\nTemporary password: ${issued.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function toggleActive(member: StaffMember) {
    const activating = member.status === 'Inactive';
    Alert.alert(
      activating ? 'Reactivate administrator' : 'Deactivate administrator',
      activating
        ? `${member.name} will regain portal access immediately.`
        : `${member.name} will immediately lose portal access.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: activating ? 'Reactivate' : 'Deactivate',
          style: activating ? 'default' : 'destructive',
          onPress: async () => { await setStaffActiveAction({ id: member.id, active: activating }); load(); },
        },
      ],
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ThemedText color="textSecondary">{error}</ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!staff) {
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
            <ThemedText variant="title">Staff Accounts</ThemedText>
            <ThemedText variant="small" color="textSecondary">{staff.length} sub-admins</ThemedText>
          </View>
          <Button label="Add" variant="secondary" size="sm" onPress={() => { setForm(emptyForm); setFormError(''); setModalOpen(true); }} />
        </View>

        <ScrollView contentContainerStyle={styles.list}>
          {issued && (
            <Card style={[styles.credentialsBox, { backgroundColor: theme.accentSurface }]}>
              <View style={styles.credentialsHeader}>
                <KeyRound size={14} color={Ink[600]} />
                <ThemedText variant="small" style={{ color: Ink[700], flex: 1 }}>Credentials — auto-issued</ThemedText>
                <Pressable
                  onPress={() => setIssued(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss credentials">
                  <X size={14} color={theme.textMuted} />
                </Pressable>
              </View>
              <ThemedText variant="mono" style={{ fontSize: 12 }}>{issued.email}</ThemedText>
              <ThemedText variant="mono" style={{ fontSize: 12 }}>{issued.tempPassword}</ThemedText>
              <Pressable onPress={copyCredentials} style={styles.copyBtn}>
                <Copy size={12} color={Ink[600]} />
                <ThemedText variant="small" style={{ color: Ink[700] }}>{copied ? 'Copied' : 'Copy credentials'}</ThemedText>
              </Pressable>
            </Card>
          )}

          {staff.map((s) => (
            <Card key={s.id} style={{ gap: 8 }}>
              <View style={styles.row}>
                <Avatar name={s.name} size={36} />
                <View style={{ flex: 1 }}>
                  <ThemedText variant="small">{s.name}</ThemedText>
                  <ThemedText variant="small" color="textMuted">{s.role}</ThemedText>
                </View>
                <StatusPill tone={s.status === 'Active' ? 'success' : 'neutral'} label={s.status} />
              </View>
              <View style={styles.rowBetween}>
                <ThemedText variant="small" color="textMuted">{s.email}</ThemedText>
                <View style={{ flexDirection: 'row', gap: Spacing.three }}>
                  <Pressable onPress={() => setPasswordTarget(s)}>
                    <ThemedText variant="small" style={{ color: Ink[600] }}>Reset password</ThemedText>
                  </Pressable>
                  <Pressable onPress={() => toggleActive(s)}>
                    <ThemedText variant="small" style={{ color: s.status === 'Active' ? Semantic.danger : Ink[600] }}>
                      {s.status === 'Active' ? 'Deactivate' : 'Reactivate'}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </Card>
          ))}
        </ScrollView>

        <Modal visible={modalOpen} animationType="slide" onRequestClose={() => setModalOpen(false)}>
          <ThemedView style={{ flex: 1 }}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={styles.modalHeader}>
                <ThemedText variant="title" style={{ fontSize: 20 }}>Add administrator</ThemedText>
                <Pressable onPress={() => setModalOpen(false)}><ThemedText style={{ color: theme.accent }}>Close</ThemedText></Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.modalContent}>
                {!!formError && <ThemedText variant="small" style={{ color: Semantic.danger }}>{formError}</ThemedText>}
                <TextField label="Full name" value={form.fullName} onChangeText={(v) => setForm((f) => ({ ...f, fullName: v }))} />
                <TextField label="Email" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} autoCapitalize="none" keyboardType="email-address" />
                <TextField label="Phone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} keyboardType="phone-pad" />
                <ChipSelect
                  label="Role"
                  options={STAFF_ROLES.map((r) => STAFF_ROLE_LABEL[r])}
                  value={STAFF_ROLE_LABEL[form.role]}
                  onChange={(label) => setForm((f) => ({ ...f, role: STAFF_ROLES.find((r) => STAFF_ROLE_LABEL[r] === label)! }))}
                />
                <Button
                  label={saving ? 'Creating…' : 'Create & Issue Login'}
                  loading={saving}
                  disabled={!form.fullName || !form.email || !form.phone}
                  onPress={handleCreate}
                  fullWidth
                />
              </ScrollView>
            </SafeAreaView>
          </ThemedView>
        </Modal>

        <SetPasswordModal
          visible={!!passwordTarget}
          targetName={passwordTarget?.name ?? ''}
          username={passwordTarget?.email ?? ''}
          onClose={() => setPasswordTarget(null)}
          onSubmit={(newPassword) => setStaffPasswordAction({ id: passwordTarget!.id, newPassword })}
        />
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
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  credentialsBox: { gap: 8, borderRadius: Radius.lg },
  credentialsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.four },
  modalContent: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three },
});
