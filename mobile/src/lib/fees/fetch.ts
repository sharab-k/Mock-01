import { callMobileApi, getMobileApi } from '@/lib/api/client';

export type FeeRosterRow = {
  id: string;
  full_name: string;
  roll_number: string;
  gr_number: string | null;
  grade: string;
  section: string;
  status: 'paid' | 'unpaid';
};

export async function fetchFeeRoster(year: number, month: number) {
  return getMobileApi<{ students: FeeRosterRow[] }>(`/api/mobile/fees?year=${year}&month=${month}`);
}

export async function setFeeStatusAction(input: { studentId: string; studentName: string; year: number; month: number; status: 'paid' | 'unpaid' }) {
  return callMobileApi('/api/mobile/fees', input);
}
