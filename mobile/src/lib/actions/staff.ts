import { callMobileApi } from '@/lib/api/client';
import type { StaffRole } from '@/lib/staff/roles';

export type CreateStaffInput = { fullName: string; email: string; phone: string; role: StaffRole };
export type CreateStaffResult = { ok: true; email: string; tempPassword: string } | { ok: false; error: string };

export async function createStaffAction(input: CreateStaffInput): Promise<CreateStaffResult> {
  const result = await callMobileApi<{ email: string; tempPassword: string }>('/api/mobile/staff', input);
  return result as CreateStaffResult;
}

export async function setStaffActiveAction(input: { id: string; active: boolean }) {
  const { id, ...body } = input;
  return callMobileApi(`/api/mobile/staff/${id}/active`, body);
}
