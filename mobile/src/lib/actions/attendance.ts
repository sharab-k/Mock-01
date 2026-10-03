import { callMobileApi } from '@/lib/api/client';

type Status = 'present' | 'absent' | 'late';

export type SubmitClassAttendanceInput = {
  classDate?: string;
  classLabel?: string;
  records: { studentId: string; studentName: string; status: Status }[];
};

// Mobile client for lib/actions/attendance.ts's submitClassAttendanceAction
// (Phase 0's app/api/mobile/attendance/submit route) — same validation,
// audit logging, and absence-alert pipeline as the web's AttendanceMarker.
export async function submitClassAttendanceAction(input: SubmitClassAttendanceInput) {
  return callMobileApi<{ notifiedCount: number }>('/api/mobile/attendance/submit', input);
}

export type MarkAttendanceInput = {
  studentId: string;
  studentName: string;
  status: Status;
  classDate?: string;
};

export async function markAttendanceAction(input: MarkAttendanceInput) {
  return callMobileApi<{ notified: boolean }>('/api/mobile/attendance/mark', input);
}

// Manual Send Alert / Resend for an absent student — the same
// /api/notifications route the web's roster button calls (bearer-authed by
// resolveRequestClient). `sent` means saved to the parent portal(s); WhatsApp/SMS
// is attempted in the background on top of that.
export async function sendAbsenceAlertAction(input: { studentId: string; studentName: string; classDate: string }) {
  return callMobileApi<{ notified: number; sent: boolean }>('/api/notifications', input);
}
