import { callMobileApi } from '@/lib/api/client';
import type { Grade, Section } from '@/lib/students/constants';

export type EnrolStudentInput = {
  studentName: string;
  grade: Grade;
  section: Section;
  program: string;
  isLate: boolean;
  parentName: string;
  parentPhone: string;
  parentSecondaryPhone?: string;
  parentWhatsapp2?: string;
  guardianProfession?: string;
  previousSchool?: string;
  lastQualification?: string;
  address?: string;
  grNumber: string;
  registrationFee?: number;
  tuitionFee?: number;
  stream?: 'Pre-Engineering' | 'Pre-Medical' | 'Computer Science' | 'Commerce';
};

export type EnrolStudentResult =
  | { ok: true; rollNumber: string; registrationNumber: string; parentAccountType: 'new'; username: string; tempPassword: string }
  | { ok: true; rollNumber: string; registrationNumber: string; parentAccountType: 'existing'; username: string }
  | { ok: false; error: string };

// Mobile client for lib/actions/enrol-student.ts's enrolStudentAction
// (Phase 0's app/api/mobile/enrol-student route) — same RPC + service-role
// parent lookup/creation as the web's admissions flow.
export async function enrolStudentAction(input: EnrolStudentInput): Promise<EnrolStudentResult> {
  const result = await callMobileApi<Omit<Extract<EnrolStudentResult, { ok: true }>, 'ok'>>('/api/mobile/enrol-student', input);
  return result as EnrolStudentResult;
}
