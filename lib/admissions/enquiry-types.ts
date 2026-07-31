export type EnquiryStatus = 'Unread' | 'Contacted' | 'Awaiting Visit' | 'Enrolled' | 'Declined'

export type Enquiry = {
  id: string
  parent_name: string
  parent_phone: string
  grade_interest: string
  program_interest: string
  message: string
  status: EnquiryStatus
  received_at: string
}

export const STATUS_STYLE: Record<EnquiryStatus, string> = {
  Unread: 'bg-ink-100 text-ink-700',
  Contacted: 'bg-success-bg text-success',
  'Awaiting Visit': 'bg-warning-bg text-warning',
  Enrolled: 'bg-success-bg text-success',
  Declined: 'bg-neutral-100 text-neutral-500',
}
