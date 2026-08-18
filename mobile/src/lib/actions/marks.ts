import { callMobileApi } from '@/lib/api/client';

export type BulkSaveMarksInput = {
  subject: string;
  examType: 'monthly' | 'half_yearly' | 'final';
  maxScore: number;
  classLabel?: string;
  entries: { studentId: string; studentName: string; score: number }[];
};

// Mobile client for lib/actions/marks.ts's bulkSaveMarksAction (Phase 0's
// app/api/mobile/marks route) — same insert/update + edit-history + grade
// alert pipeline as the web's MarksEnterContent.
export async function bulkSaveMarksAction(input: BulkSaveMarksInput) {
  return callMobileApi<{ inserted: number; updated: number; notified: number }>('/api/mobile/marks', input);
}
