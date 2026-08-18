import { StyleSheet, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Semantic, Spacing } from '@/constants/theme';

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <AlertCircle size={22} color={Semantic.danger} />
      <ThemedText color="textSecondary" style={styles.message}>{message}</ThemedText>
      <Button label="Retry" variant="secondary" size="sm" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  message: { textAlign: 'center' },
});
