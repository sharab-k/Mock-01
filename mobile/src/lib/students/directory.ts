import { callMobileApi, getMobileApi } from '@/lib/api/client';
import type { Grade, Program, Section } from '@/lib/students/constants';

export type DirectoryStudent = {
  id: string;
  roll_number: string;
  registration_number: string;
  full_name: string;
  grade: Grade;
  section: Section;
  program: Program;
  status: 'Active' | 'Inactive';
  enrollment_date: string;
  is_late_enrollment: boolean;
  parent_id: string | null;
  parent_name: string;
  parent_email: string | null;
  parent_phone: string;
  guardian_profession: string | null;
  previous_school: string | null;
  last_qualification: string | null;
  address: string | null;
  gr_number: string | null;
  registration_fee: number | null;
  tuition_fee: number | null;
  stream: string | null;
  fee_status: 'paid' | 'unpaid';
};

// Mobile client for the read-only GET on app/api/mobile/students/route.ts —
// mirrors app/(super-admin)/super-admin/students/page.tsx's full field set
// exactly, so the mobile Student Directory can offer the same edit surface.
export async function fetchStudentDirectory() {
  return getMobileApi<{ students: DirectoryStudent[] }>('/api/mobile/students');
}

export type UpdateStudentInput = {
  fullName: string;
  program: Program;
  section: Section;
  isLate: boolean;
  stream?: string;
  guardianProfession?: string;
  previousSchool?: string;
  lastQualification?: string;
  address?: string;
  grNumber?: string;
  rollNumber?: string;
  registrationFee?: number;
  tuitionFee?: number;
};

// Reuses the same generic PATCH route mobile already had for grade/section
// edits — updateStudentAction's schema was widened on web to cover the
// whole admission form, so this just sends the fuller body through
// unchanged. Server-side role checks (G.R./Roll No. Super-Admin-only,
// locked-once-set) are re-verified there regardless of what this sends.
export async function updateStudentAction(id: string, input: UpdateStudentInput) {
  return callMobileApi(`/api/mobile/students/${id}`, input, 'PATCH');
}

export async function deleteStudentAction(id: string) {
  return callMobileApi(`/api/mobile/students/${id}`, {}, 'DELETE');
}

export async function updateParentContactAction(input: {
  id: string;
  fullName: string;
  phone: string;
  secondaryPhone?: string;
  whatsapp2?: string;
}) {
  const { id, ...body } = input;
  return callMobileApi(`/api/mobile/parents/${id}/contact`, body);
}
