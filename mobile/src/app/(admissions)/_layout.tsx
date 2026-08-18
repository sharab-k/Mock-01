import { Stack } from 'expo-router';
import { PortalGate } from '@/components/portal-gate';

export default function AdmissionsLayout() {
  return (
    <PortalGate expectedRole="admissions_admin">
      <Stack screenOptions={{ headerShown: false }} />
    </PortalGate>
  );
}
