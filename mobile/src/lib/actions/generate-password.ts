import { getMobileApi } from '@/lib/api/client';

export async function suggestPasswordAction() {
  return getMobileApi<{ password: string }>('/api/mobile/generate-password');
}
