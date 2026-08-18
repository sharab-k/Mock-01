import { callMobileApi } from '@/lib/api/client';

export type TeacherInput = {
  fullName: string;
  subject: string;
  classes: string[];
  email?: string;
  phone?: string;
};

export async function createTeacherAction(input: TeacherInput) {
  return callMobileApi<{ id: string }>('/api/mobile/teachers', input);
}

export async function updateTeacherAction(input: TeacherInput & { id: string }) {
  const { id, ...body } = input;
  return callMobileApi(`/api/mobile/teachers/${id}`, body, 'PATCH');
}

export async function deleteTeacherAction(input: { id: string }) {
  return callMobileApi(`/api/mobile/teachers/${input.id}`, undefined, 'DELETE');
}
