import type { EnquiryStatus } from '@/lib/admissions/enquiry-types'
import type { Database } from '@/types/supabase'

export type DbEnquiryStatus = Database['public']['Enums']['enquiry_status']

export const STATUS_TO_DB: Record<EnquiryStatus, DbEnquiryStatus> = {
  Unread: 'unread',
  Contacted: 'contacted',
  'Awaiting Visit': 'awaiting_visit',
  Enrolled: 'enrolled',
  Declined: 'declined',
}

export const STATUS_FROM_DB: Record<DbEnquiryStatus, EnquiryStatus> = {
  unread: 'Unread',
  contacted: 'Contacted',
  awaiting_visit: 'Awaiting Visit',
  enrolled: 'Enrolled',
  declined: 'Declined',
}
