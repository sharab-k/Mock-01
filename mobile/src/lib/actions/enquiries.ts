import { callMobileApi } from '@/lib/api/client';
import type { DbEnquiryStatus } from '@/lib/admissions/enquiry-mapping';

export async function updateEnquiryStatusAction(input: { id: string; status: DbEnquiryStatus }) {
  const { id, ...body } = input;
  return callMobileApi(`/api/mobile/enquiries/${id}/status`, body);
}
