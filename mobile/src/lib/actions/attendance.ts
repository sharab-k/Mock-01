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
