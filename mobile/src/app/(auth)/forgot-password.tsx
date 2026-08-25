import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Radius, Semantic, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase/client';

// Staff/admin accounts only — parent accounts use a synthetic, non-mailbox
// login email auto-generated at enrolment (see lib/auth/generate-credentials.ts
// on web), so an email reset link would silently go nowhere for them. A
// parent who forgets their password needs a Super Admin/Admissions Admin to
// reset it directly (Student/Parent Directory → Reset password), same
// scoping decision as the web app's forgot-password flow.
export default function ForgotPasswordScreen() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email) return;
    setSubmitting(true);
    // Always show the same success state regardless of whether the account
    // exists, to avoid email enumeration — Supabase's API itself doesn't
    // error on an unknown email either.
    await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'jeacademy://reset-password' });
    setSubmitting(false);
    setSent(true);
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <ThemedText variant="serifTitle" style={{ textAlign: 'center' }}>Forgot password</ThemedText>
              <ThemedText color="textSecondary" style={{ textAlign: 'center' }}>
                For staff and admin accounts. Parent accounts are reset by an administrator directly.
              </ThemedText>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {sent ? (
                <View style={{ alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.two }}>
                  <CheckCircle2 size={32} color={Semantic.success} />
                  <ThemedText style={{ textAlign: 'center' }}>
                    If that email exists, we&apos;ve sent a reset link. Check your inbox.
                  </ThemedText>
                </View>
              ) : (
                <>
                  <TextField
                    label="Email address"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    placeholder="you@jeacademy.edu.pk"
                  />
                  <Button label={submitting ? 'Sending…' : 'Send reset link'} onPress={handleSubmit} loading={submitting} disabled={!email} fullWidth />
                </>
              )}
              <ThemedText variant="small" onPress={() => router.back()} style={{ color: theme.accent, textAlign: 'center', marginTop: 4 }}>
                Back to sign in
              </ThemedText>
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
});
