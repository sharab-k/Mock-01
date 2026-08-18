import { getMobileApi } from '@/lib/api/client';

export type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  time: string;
  date: string;
  flag: boolean;
};

// Mobile client for the new read-only app/api/mobile/audit route —
// fetchAuditLog needs the service-role client for the profiles join.
export async function fetchAuditLog(limit = 200) {
  return getMobileApi<{ entries: AuditEntry[] }>(`/api/mobile/audit?limit=${limit}`);
}
