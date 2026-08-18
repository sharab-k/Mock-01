import { Stack } from 'expo-router';
import { PortalGate } from '@/components/portal-gate';

export default function SuperAdminLayout() {
  return (
    <PortalGate expectedRole="super_admin">
      <Stack screenOptions={{ headerShown: false }} />
    </PortalGate>
  );
}
