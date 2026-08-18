export type NoticeAudience = 'All' | 'Students' | 'Parents' | 'Staff';
export type NoticeCategory = 'Academic' | 'Event' | 'Holiday' | 'Admissions';

export type Notice = {
  id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  audience: NoticeAudience;
  published_at: string;
  published: boolean;
};

// Same four categories as the web's CATEGORY_STYLE, mapped to StatusPill
// tones instead of Tailwind classes.
export const CATEGORY_TONE: Record<NoticeCategory, 'success' | 'ink' | 'warning' | 'danger'> = {
  Academic: 'success',
  Event: 'ink',
  Holiday: 'warning',
  Admissions: 'danger',
};
