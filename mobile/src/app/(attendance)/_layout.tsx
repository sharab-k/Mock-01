import { Stack } from 'expo-router';
import { PortalGate } from '@/components/portal-gate';

export default function AttendanceLayout() {
  return (
    <PortalGate expectedRole="attendance_admin">
      <Stack screenOptions={{ headerShown: false }} />
    </PortalGate>
  );
}
