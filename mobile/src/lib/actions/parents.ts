import { callMobileApi, getMobileApi } from '@/lib/api/client';

export type ParentDirectoryRow = {
  key: string;
  name: string;
  email: string;
  phone: string;
  secondaryPhone: string | null;
  whatsapp2: string | null;
  isActive: boolean;
  createdAt: string;
  children: { name: string; roll: string; grNumber: string | null; grade: string; section: string }[];
};

// Mobile client for the read-only GET on app/api/mobile/parents/route.ts —
// fetchParentDirectory needs the service-role client, which can't run on
// the mobile app.
export async function fetchParentDirectory() {
  return getMobileApi<{ parents: ParentDirectoryRow[] }>('/api/mobile/parents');
}

export async function setParentPasswordAction(input: { id: string; newPassword: string }) {
  const { id, ...body } = input;
  return callMobileApi(`/api/mobile/parents/${id}/password`, body);
}
