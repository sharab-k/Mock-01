// Canonical notice board — only Super Admin's Notices page creates/edits these;
// every other role consumes this list read-only.
// TODO: replace with a Supabase query against the `notices` table.

export type NoticeAudience = 'All' | 'Students' | 'Parents' | 'Staff'
export type NoticeCategory = 'Academic' | 'Event' | 'Holiday' | 'Admissions'

export type Notice = {
  id: string
  title: string
  body: string
  category: NoticeCategory
  audience: NoticeAudience
  published_at: string
  published: boolean
}

export const CATEGORY_STYLE: Record<NoticeCategory, string> = {
  Academic: 'bg-success-bg text-success',
  Event: 'bg-ink-100 text-ink-700',
  Holiday: 'bg-warning-bg text-warning',
  Admissions: 'bg-danger-bg text-danger',
}

export const NOTICES: Notice[] = [
  {
    id: 'ntc-1',
    title: 'PTM Scheduled – Grade 10',
    body: 'Parent-Teacher Meeting for Grade 10 is on Saturday 28 June at 9:00 AM in the main hall. All subject teachers will be present.',
    category: 'Event',
    audience: 'Parents',
    published_at: '24 Jun 2026',
    published: true,
  },
  {
    id: 'ntc-2',
    title: 'Eid Ul-Adha Holiday',
    body: 'School will remain closed 25–27 June 2026 for Eid Ul-Adha. Regular schedule resumes 28 June.',
    category: 'Holiday',
    audience: 'All',
    published_at: '20 Jun 2026',
    published: true,
  },
  {
    id: 'ntc-3',
    title: 'Half-Yearly Results Released',
    body: 'Half-Yearly examination results are published. Download the progress report from the student or parent portal.',
    category: 'Academic',
    audience: 'All',
    published_at: '18 Jun 2026',
    published: true,
  },
  {
    id: 'ntc-4',
    title: 'Science Fair – Registration Open',
    body: 'Annual Science Fair registrations are open. Students may register at the academic office by 10 July.',
    category: 'Event',
    audience: 'Students',
    published_at: '15 Jun 2026',
    published: true,
  },
  {
    id: 'ntc-5',
    title: 'Admissions Open for 2026–27',
    body: 'Applications for the next academic year are now being accepted across all programmes.',
    category: 'Admissions',
    audience: 'All',
    published_at: '10 Jun 2026',
    published: true,
  },
  {
    id: 'ntc-6',
    title: 'Staff Development Workshop',
    body: 'All teaching staff are required to attend the curriculum workshop on 30 June, 2:00 PM, Staff Room.',
    category: 'Event',
    audience: 'Staff',
    published_at: '8 Jun 2026',
    published: false,
  },
]
