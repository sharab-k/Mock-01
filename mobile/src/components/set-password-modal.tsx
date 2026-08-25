import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { AlertCircle, Check, CheckCircle2, Copy, KeyRound, Sparkles, X } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { suggestPasswordAction } from '@/lib/actions/generate-password';

type Props = {
  visible: boolean;
  targetName: string;
  /** Login email — shown so the admin knows exactly what to send along with the new password. */
  username: string;
  onSubmit: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
};

// Shared by every "reset password" entry point on mobile (Staff, Parent
// Directory, Student Directory) — mirrors components/dashboard/SetPasswordModal.tsx
// on web exactly: admin types (or generates) a specific new password, then
// sees a copyable Username + Password card. Passwords are one-way hashed by
// Supabase Auth and can never be retrieved once set, so this reset-and-copy
// flow is the only safe way to recover a forgotten login.
export function SetPasswordModal({ visible, targetName, username, onSubmit, onClose }: Props) {
  const theme = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  function reset() {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setDone(false);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleGenerate() {
    setGenerating(true);
    const result = await suggestPasswordAction();
    setGenerating(false);
    if (result.ok) {
      setPassword(result.password);
      setConfirmPassword(result.password);
    }
  }

  async function handleSubmit() {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSaving(true);
    setError('');
    const outcome = await onSubmit(password);
    setSaving(false);
    if (outcome.ok) setDone(true);
    else setError(outcome.error ?? 'Could not update the password.');
  }

  async function copyCredentials() {
    await Clipboard.setStringAsync(`Username: ${username}\nPassword: ${password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => !saving && handleClose()} />
        <SafeAreaView style={styles.sheetWrap}>
          <ThemedView style={[styles.sheet, { backgroundColor: theme.surface }]}>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.iconBadge, { backgroundColor: theme.accentSurface }]}>
                  <KeyRound size={18} color={Ink[600]} />
                </View>
                <ThemedText variant="title" style={{ fontSize: 16 }}>{done ? 'Password updated' : 'Reset password'}</ThemedText>
              </View>
              <Pressable onPress={handleClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="Close">
                <X size={18} color={theme.textMuted} />
              </Pressable>
            </View>

            {done ? (
              <View style={styles.content}>
                <View style={styles.successIconWrap}>
                  <View style={[styles.successIcon, { backgroundColor: Semantic.successBg }]}>
                    <CheckCircle2 size={24} color={Semantic.success} />
                  </View>
                </View>
                <ThemedText variant="small" color="textSecondary" style={styles.centerText}>
                  Share these new credentials with {targetName} — this password won&apos;t be shown again after you close this.
                </ThemedText>
                <Card style={[styles.credBox, { backgroundColor: theme.accentSurface }]}>
                  <View style={styles.credRow}>
                    <ThemedText variant="small" color="textMuted">Username</ThemedText>
                    <ThemedText variant="mono" style={{ fontSize: 12, flexShrink: 1, textAlign: 'right' }}>{username}</ThemedText>
                  </View>
                  <View style={styles.credRow}>
                    <ThemedText variant="small" color="textMuted">Password</ThemedText>
                    <ThemedText variant="mono" style={{ fontSize: 12, flexShrink: 1, textAlign: 'right' }}>{password}</ThemedText>
                  </View>
                </Card>
                <Pressable onPress={copyCredentials} style={[styles.copyBtn, { borderColor: theme.border }]}>
                  {copied ? <Check size={13} color={Semantic.success} /> : <Copy size={13} color={Ink[600]} />}
                  <ThemedText variant="small" style={{ color: Ink[700] }}>{copied ? 'Copied' : 'Copy credentials'}</ThemedText>
                </Pressable>
                <Button label="Done" onPress={handleClose} fullWidth />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={[styles.usernameBox, { backgroundColor: theme.surfaceElement }]}>
                  <ThemedText variant="small" color="textMuted">Username</ThemedText>
                  <ThemedText variant="mono" style={{ fontSize: 13 }}>{username}</ThemedText>
                </View>
                <ThemedText variant="small" color="textSecondary">
                  Set a new password for {targetName}. They&apos;ll need it to sign in next time.
                </ThemedText>

                {!!error && (
                  <View style={[styles.errorBanner, { backgroundColor: Semantic.dangerBg }]}>
                    <AlertCircle size={14} color={Semantic.danger} />
                    <ThemedText variant="small" style={{ color: Semantic.danger, flex: 1 }}>{error}</ThemedText>
                  </View>
                )}

                <View style={styles.fieldHeader}>
                  <ThemedText variant="label" color="textSecondary">New password</ThemedText>
                  <Pressable onPress={handleGenerate} disabled={generating} style={styles.generateBtn}>
                    <Sparkles size={12} color={Ink[600]} />
                    <ThemedText variant="small" style={{ color: Ink[700] }}>{generating ? 'Generating…' : 'Generate'}</ThemedText>
                  </Pressable>
                </View>
                <TextField value={password} onChangeText={setPassword} placeholder="At least 8 characters" autoCapitalize="none" />
                <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" autoCapitalize="none" />

                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button label="Cancel" variant="secondary" onPress={handleClose} disabled={saving} fullWidth />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button label={saving ? 'Saving…' : 'Set password'} loading={saving} onPress={handleSubmit} fullWidth />
                  </View>
                </View>
              </ScrollView>
            )}
          </ThemedView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheetWrap: { maxHeight: '90%' },
  sheet: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, overflow: 'hidden' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.four, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  iconBadge: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.three },
  usernameBox: { borderRadius: Radius.md, padding: Spacing.three, gap: 2 },
  errorBanner: { flexDirection: 'row', gap: 8, borderRadius: Radius.md, padding: Spacing.three, alignItems: 'flex-start' },
  fieldHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actions: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two },
  successIconWrap: { alignItems: 'center' },
  successIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  credBox: { gap: 8, borderRadius: Radius.lg },
  credRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderRadius: Radius.md, paddingVertical: 10,
  },
});
