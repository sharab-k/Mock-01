import { Stack } from 'expo-router';
import { PortalGate } from '@/components/portal-gate';

// `student` maps here too (ROLE_DESTINATIONS) even though no profile is
// ever actually created with that role — see CLAUDE.md §4. PortalGate's
// expectedRole stays 'parent' since that's the only role that can reach
// this group in practice.
export default function ParentLayout() {
  return (
    <PortalGate expectedRole="parent">
      <Stack screenOptions={{ headerShown: false }} />
    </PortalGate>
  );
}
