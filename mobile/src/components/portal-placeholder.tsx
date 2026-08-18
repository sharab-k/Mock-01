import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { RoleChip } from '@/components/ui/role-badge';
import { Spacing } from '@/constants/theme';
import type { PortalRole } from '@/constants/theme';
import { useAuth } from '@/lib/auth/auth-context';

// Temporary home screen for a portal whose real build hasn't landed yet
// (Phases 3–7). Proves the auth + role-routing plumbing end-to-end — signed
// in, correctly gated to this role, real profile name/email rendered from
// the session — without pretending the portal itself is built.
export function PortalPlaceholder({
  portalRole,
  label,
  phaseNote,
}: {
  portalRole: PortalRole;
  label: string;
  phaseNote: string;
}) {
  const { profile, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Avatar name={profile?.fullName ?? label} />
          <View style={{ flex: 1 }}>
            <ThemedText variant="bodyMedium">{profile?.fullName ?? 'Signed in'}</ThemedText>
            <ThemedText variant="small" color="textSecondary">{profile?.email}</ThemedText>
          </View>
          <RoleChip role={portalRole} label={label} />
        </View>

        <View style={styles.body}>
          <ThemedText variant="title">{label} portal</ThemedText>
          <ThemedText color="textSecondary" style={{ marginTop: Spacing.two }}>
            {phaseNote}
          </ThemedText>
        </View>

        <View style={{ marginTop: Spacing.five }}>
          <Button label="Log out" variant="secondary" onPress={signOut} />
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, padding: Spacing.four },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  body: { marginTop: Spacing.six },
});
