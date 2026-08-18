import { getMobileApi } from '@/lib/api/client';

export type RosterStatus = 'unmarked' | 'present' | 'absent' | 'late';

export type RosterStudent = {
  id: string;
  name: string;
  roll: string;
  grade: string;
  section: string;
  status: RosterStatus;
  parentPhone: string | null;
  alertStatus: 'sent' | 'failed' | null;
  termAttendance: { present: number; absent: number; late: number; total: number };
};

// Mobile client for the read-only app/api/mobile/attendance/class-roster
// route — this one read needs the service-role client (parent phone, alert
// status), which can't run directly from the mobile app, so it goes through
// the server the same way the write actions do (Phase 0).
export async function fetchClassRoster(grade: string, section: string) {
  return getMobileApi<{ roster: RosterStudent[] }>(`/api/mobile/attendance/class-roster?grade=${grade}&section=${section}`);
}
