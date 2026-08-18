import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, type Href } from 'expo-router';

import { useAuth } from '@/lib/auth/auth-context';
import { ROLE_DESTINATIONS, type UserRole } from '@/lib/auth/role-destinations';
import { useTheme } from '@/hooks/use-theme';

// The mobile equivalent of every web route group's layout.tsx calling
// requireRole() (CLAUDE.md §4 / golden rule 8): UX gating only, never the
// real access boundary — RLS enforces the same rule at the database level
// regardless of what this component does. A wrong-role or signed-out
// visitor is redirected to their own portal (or /login), never shown a
// blank or error screen, matching the web's "never a dead end" behavior.
export function PortalGate({ expectedRole, children }: { expectedRole: UserRole; children: ReactNode }) {
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

  if (role !== expectedRole) {
    // Computed from a role→path record, which typedRoutes can't verify
    // statically — every value is one of the known literal routes below.
    const destination = (role ? ROLE_DESTINATIONS[role] : '/login') as Href;
    return <Redirect href={destination} />;
  }

  return <>{children}</>;
}
