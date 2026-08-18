import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { AlertCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Radius, Semantic, Shadow, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth, type AuthErrorCode } from '@/lib/auth/auth-context';

// Mirrors the web's app/(auth)/login/page.tsx ERROR_MESSAGES exactly, minus
// the "Supabase not configured" dev-bypass copy — the mobile client throws
// at import time if env vars are missing, so that state can't be reached
// once the app is running.
const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  invalid_credentials: 'Incorrect email or password. Please try again.',
  no_role: 'Your account has not been assigned a role. Contact your administrator.',
  account_inactive: 'This account has been deactivated. Contact your Super Admin to restore access.',
  unknown: 'Something went wrong. Please try again.',
};

export default function LoginScreen() {
  const theme = useTheme();
  const { session, loading: authLoading, signIn } = useAuth();
  const params = useLocalSearchParams<{ error?: string }>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorCode, setErrorCode] = useState<AuthErrorCode | null>(
    (params.error as AuthErrorCode) ?? null,
  );

  // Already signed in (e.g. deep-linked back here) — let the root gate route
  // to the right portal instead of showing the form again.
  if (!authLoading && session) return <Redirect href="/" />;

  async function handleSubmit() {
    if (!email || !password) return;
    setSubmitting(true);
    setErrorCode(null);
    const { error } = await signIn(email.trim(), password);
    setSubmitting(false);
    if (error) {
      setErrorCode(error);
      return;
    }
    router.replace('/');
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <View style={styles.hero}>
              <View style={[styles.logoWrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Image
                  source={require('@/assets/images/icon.png')}
                  style={styles.logo}
                  resizeMode="contain"
                  alt="JE Academy logo"
                />
              </View>
              <ThemedText variant="serifTitle" style={{ textAlign: 'center' }}>
                Sign in to JE Academy
              </ThemedText>
              <ThemedText color="textSecondary" style={{ textAlign: 'center' }}>
                Enter your credentials to access your portal.
              </ThemedText>
            </View>

            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              {errorCode && (
                <View style={[styles.errorBanner, { backgroundColor: Semantic.dangerBg }]}>
                  <AlertCircle size={16} color={Semantic.danger} />
                  <ThemedText variant="small" style={{ color: Semantic.danger, flex: 1 }}>
                    {ERROR_MESSAGES[errorCode]}
                  </ThemedText>
                </View>
              )}

              <TextField
                label="Email address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                placeholder="you@jeacademy.edu.pk"
              />
              <TextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="current-password"
                placeholder="••••••••"
              />

              <Button
                label="Sign in"
                onPress={handleSubmit}
                loading={submitting}
                disabled={!email || !password}
                fullWidth
              />
            </View>

            <ThemedText variant="small" color="textMuted" style={styles.footer}>
              Credentials are issued by your administrator.{'\n'}There is no self-registration.
            </ThemedText>
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
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
    ...Shadow[1],
  },
  logo: { width: 40, height: 40 },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.four,
    gap: Spacing.three,
    ...Shadow[2],
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radius.md,
    padding: 12,
  },
  footer: { textAlign: 'center', lineHeight: 18 },
});
