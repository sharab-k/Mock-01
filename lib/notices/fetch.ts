import { createClient } from '@/lib/supabase/server'
import type { Notice, NoticeCategory, NoticeAudience } from '@/lib/notices/types'

function formatPublishedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// One function for every read-only consumer (admissions/student/parent
// panels, the public landing page) — RLS transparently scopes the result set
// to what that caller's actual session (or anon) is allowed to see, so there
// is no per-role branching here. Super Admin's own CRUD page uses
// fetchAllNoticesForAdmin instead, which also needs unpublished drafts.
export async function fetchVisibleNotices(): Promise<Notice[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notices')
    .select('id, title, body, category, audience, published, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })

  return (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    category: n.category as NoticeCategory,
    audience: n.audience as NoticeAudience,
    published: n.published,
    published_at: formatPublishedAt(n.published_at),
  }))
}

// Super Admin's own notices page — sees drafts too (RLS's
// super_admin_manage_notices policy is unconditional FOR ALL).
export async function fetchAllNoticesForAdmin(): Promise<Notice[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('notices')
    .select('id, title, body, category, audience, published, published_at')
    .order('published_at', { ascending: false })

  return (data ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    category: n.category as NoticeCategory,
    audience: n.audience as NoticeAudience,
    published: n.published,
    published_at: formatPublishedAt(n.published_at),
  }))
}
