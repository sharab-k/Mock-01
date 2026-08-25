import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Radius, Semantic, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase/client';

// Deep-link target for the password-reset email — Supabase sends
// jeacademy://reset-password?code=... (PKCE flow, same as the web app's
// app/auth/callback/route.ts). Untested against a real device/email in this
// environment; verify end-to-end before shipping.
export default function ResetPasswordScreen() {
  const theme = useTheme();
  const { code } = useLocalSearchParams<{ code?: string }>();
  const [status, setStatus] = useState<'exchanging' | 'ready' | 'invalid'>(code ? 'exchanging' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      setStatus(exchangeError ? 'invalid' : 'ready');
    });
  }, [code]);

  async function handleSubmit() {
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSubmitting(false);
      setError(updateError.message);
      return;
    }
    await supabase.auth.signOut();
    setSubmitting(false);
    router.replace('/login');
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <ThemedText variant="serifTitle" style={{ textAlign: 'center' }}>Reset password</ThemedText>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {status === 'exchanging' && (
                <View style={{ alignItems: 'center', paddingVertical: Spacing.four }}>
                  <ActivityIndicator color={theme.accent} />
                </View>
              )}

              {status === 'invalid' && (
                <View style={{ gap: Spacing.three }}>
                  <View style={[styles.errorBanner, { backgroundColor: Semantic.dangerBg }]}>
                    <AlertCircle size={16} color={Semantic.danger} />
                    <ThemedText variant="small" style={{ color: Semantic.danger, flex: 1 }}>
                      This password reset link is invalid or has expired. Please request a new one.
                    </ThemedText>
                  </View>
                  <Button label="Back to sign in" variant="secondary" onPress={() => router.replace('/login')} fullWidth />
                </View>
              )}

              {status === 'ready' && (
                <>
                  {!!error && (
                    <View style={[styles.errorBanner, { backgroundColor: Semantic.dangerBg }]}>
                      <AlertCircle size={16} color={Semantic.danger} />
                      <ThemedText variant="small" style={{ color: Semantic.danger, flex: 1 }}>{error}</ThemedText>
                    </View>
                  )}
                  <TextField label="New password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" autoCapitalize="none" secureTextEntry />
                  <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Re-enter password" autoCapitalize="none" secureTextEntry />
                  <Button label={submitting ? 'Saving…' : 'Set new password'} onPress={handleSubmit} loading={submitting} fullWidth />
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.five, justifyContent: 'center', flexGrow: 1 },
  hero: { alignItems: 'center', gap: Spacing.two },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.four, gap: Spacing.three, ...Shadow[2] },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.md, padding: 12 },
});
