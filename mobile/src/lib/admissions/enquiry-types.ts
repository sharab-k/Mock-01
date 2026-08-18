export type EnquiryStatus = 'Unread' | 'Contacted' | 'Awaiting Visit' | 'Enrolled' | 'Declined';

export type Enquiry = {
  id: string;
  parent_name: string;
  parent_phone: string;
  grade_interest: string;
  program_interest: string;
  message: string;
  status: EnquiryStatus;
  received_at: string;
};

// Same four tones as the web's STATUS_STYLE, mapped to StatusPill tones.
export const STATUS_TONE: Record<EnquiryStatus, 'ink' | 'success' | 'warning' | 'neutral'> = {
  Unread: 'ink',
  Contacted: 'success',
  'Awaiting Visit': 'warning',
  Enrolled: 'success',
  Declined: 'neutral',
};

export const NEXT_STATUS: Record<EnquiryStatus, EnquiryStatus> = {
  Unread: 'Contacted',
  Contacted: 'Awaiting Visit',
  'Awaiting Visit': 'Enrolled',
  Enrolled: 'Enrolled',
  Declined: 'Declined',
};
