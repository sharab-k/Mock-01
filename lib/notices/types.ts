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
