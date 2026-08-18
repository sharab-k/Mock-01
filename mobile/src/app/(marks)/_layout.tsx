import { Stack } from 'expo-router';
import { PortalGate } from '@/components/portal-gate';

export default function MarksLayout() {
  return (
    <PortalGate expectedRole="marks_admin">
      <Stack screenOptions={{ headerShown: false }} />
    </PortalGate>
  );
}
