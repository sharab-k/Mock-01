// Canonical admission enquiry inbox — owned by Admissions Admin.
// Status vocabulary matches the inline preview already shipped on the
// Admissions dashboard root (app/(admissions)/admissions/page.tsx).
// TODO: replace with a Supabase query against the `admission_enquiries` table.

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

export const ENQUIRIES: Enquiry[] = [
  { id: 'enq-1', parent_name: 'Rashid Iqbal',   parent_phone: '+92 300 1234567', grade_interest: '9',  program_interest: 'Matriculation', message: 'Looking to enroll my son in Grade 9 Sciences. He passed his 8th grade with distinction.', status: 'Unread',         received_at: '24 Jun 2026, 09:12' },
  { id: 'enq-2', parent_name: 'Aisha Siddiqui', parent_phone: '+92 321 7654321', grade_interest: '10', program_interest: 'Matriculation', message: 'My son is transferring from DPS. He completed Grade 9 and will be joining Grade 10.',         status: 'Contacted',      received_at: '23 Jun 2026, 14:05' },
  { id: 'enq-3', parent_name: 'Tariq Mehmood',  parent_phone: '+92 333 1112223', grade_interest: '11', program_interest: 'Intermediate',  message: 'Enquiring about F.Sc sciences for Grade 11. Does the academy offer Phy, Chem, Bio together?', status: 'Unread',         received_at: '22 Jun 2026, 10:40' },
  { id: 'enq-4', parent_name: 'Maria Ahmed',    parent_phone: '+92 311 9998887', grade_interest: '12', program_interest: 'Intermediate',  message: 'Would like to visit campus for Grade 12 admission. Please advise on available timings.',      status: 'Awaiting Visit', received_at: '21 Jun 2026, 16:20' },
  { id: 'enq-5', parent_name: 'Khalid Farooq',  parent_phone: '+92 345 6667778', grade_interest: '9',  program_interest: 'Matriculation', message: 'We have two children looking to join Grade 9 and Grade 10. Enquiring about sibling policy.',  status: 'Contacted',      received_at: '20 Jun 2026, 11:15' },
  { id: 'enq-6', parent_name: 'Nadeem Akhtar',  parent_phone: '+92 312 5566778', grade_interest: '3',  program_interest: 'Primary Years', message: 'Interested in Grade 3 admission for next term.',              status: 'Enrolled',  received_at: '18 Jun 2026, 09:30' },
  { id: 'enq-7', parent_name: 'Farah Malik',    parent_phone: '+92 334 6677889', grade_interest: '9',  program_interest: 'Matriculation', message: 'Would like a campus tour before deciding.',                     status: 'Declined',  received_at: '16 Jun 2026, 13:10' },
]
