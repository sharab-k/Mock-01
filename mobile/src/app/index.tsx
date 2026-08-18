import { ActivityIndicator, View } from 'react-native';
import { Redirect, type Href } from 'expo-router';

import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_DESTINATIONS } from '@/lib/auth/role-destinations';
import { useTheme } from '@/hooks/use-theme';

// The mobile equivalent of the web's middleware.ts convenience redirect —
// not the access boundary (RLS is), just routes an already-signed-in user
// straight to their portal and everyone else to /login.
export default function Index() {
  const { loading, session, role } = useAuth();
  const theme = useTheme();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/login" />;
  if (!role) return <Redirect href="/login?error=no_role" />;

  return <Redirect href={ROLE_DESTINATIONS[role] as Href} />;
}
