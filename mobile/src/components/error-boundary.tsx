import { Component, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Semantic, Spacing } from '@/constants/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

// Without this, an uncaught JS render error is fatal on Android release
// builds — Hermes has no error boundary to catch it, so the whole process
// gets killed and the OS shows "App keeps stopping" with no way to see why.
// This turns that into a recoverable in-app screen with the real error
// message, both fixing the hard crash and making the next bug diagnosable
// from a screenshot instead of a blind guess.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <ThemedView style={styles.container}>
          <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.content}>
              <View style={[styles.iconWrap, { backgroundColor: Semantic.dangerBg }]}>
                <AlertTriangle size={28} color={Semantic.danger} />
              </View>
              <ThemedText variant="title" style={{ fontSize: 18, textAlign: 'center' }}>Something went wrong</ThemedText>
              <ThemedText variant="small" color="textSecondary" style={{ textAlign: 'center' }}>
                The app hit an error and this screen couldn&apos;t load. You can try again — if it keeps happening, share this message.
              </ThemedText>
              <View style={[styles.errorBox, { backgroundColor: Semantic.dangerBg }]}>
                <ThemedText variant="mono" style={{ fontSize: 11, color: Semantic.danger }}>{this.state.error.message}</ThemedText>
              </View>
              <Button label="Try again" onPress={() => this.setState({ error: null })} fullWidth />
            </ScrollView>
          </SafeAreaView>
        </ThemedView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.six, gap: Spacing.three },
  iconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  errorBox: { width: '100%', borderRadius: 10, padding: Spacing.three },
});
