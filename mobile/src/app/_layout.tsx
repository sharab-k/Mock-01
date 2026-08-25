import { useEffect } from 'react';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';

import { FontsToLoad } from '@/constants/fonts';
import { AuthProvider } from '@/lib/auth/auth-context';
import { ErrorBoundary } from '@/components/error-boundary';

SplashScreen.preventAutoHideAsync();

// Web is light-only (CLAUDE.md §6) — mobile matches it exactly, always,
// regardless of the device's system theme setting (see hooks/use-theme.ts).
function RootLayoutInner() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <ErrorBoundary>
        <Stack screenOptions={{ headerShown: false }} />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FontsToLoad);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}
