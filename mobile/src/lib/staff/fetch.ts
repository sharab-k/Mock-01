import { getMobileApi } from '@/lib/api/client';

export type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  lastLogin: string;
  status: 'Active' | 'Inactive';
};

// Mobile client for the read-only GET added to app/api/mobile/staff/route.ts
// — fetchStaffDirectory needs the service-role client (cross-account
// profiles read + auth.admin.listUsers), which can't run on the mobile app.
export async function fetchStaffDirectory() {
  return getMobileApi<{ staff: StaffMember[] }>('/api/mobile/staff');
}
