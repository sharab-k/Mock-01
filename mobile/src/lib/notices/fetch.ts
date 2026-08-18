import { supabase } from '@/lib/supabase/client';
import type { Notice, NoticeCategory, NoticeAudience } from './types';

function formatPublishedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Ported from the web's lib/notices/fetch.ts (fetchVisibleNotices only —
// the admin "see drafts too" variant belongs to the Super Admin portal,
// Phase 7). RLS scopes the result set the same way it does on web.
export async function fetchVisibleNotices(): Promise<Notice[]> {
  const { data } = await supabase
    .from('notices')
    .select('id, title, body, category, audience, published, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false });

  return (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    category: n.category as NoticeCategory,
    audience: n.audience as NoticeAudience,
    published: n.published,
    published_at: formatPublishedAt(n.published_at),
  }));
}

// Super Admin's own notices screen — sees drafts too (super_admin_manage_notices
// RLS policy is unconditional FOR ALL, no admin client needed).
export async function fetchAllNoticesForAdmin(): Promise<Notice[]> {
  const { data } = await supabase
    .from('notices')
    .select('id, title, body, category, audience, published, published_at')
    .order('published_at', { ascending: false });

  return (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    category: n.category as NoticeCategory,
    audience: n.audience as NoticeAudience,
    published: n.published,
    published_at: formatPublishedAt(n.published_at),
  }));
}
