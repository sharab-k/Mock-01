import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'
import type { Database } from '@/types/supabase'
import type { Notice, NoticeCategory, NoticeAudience } from '@/lib/notices/types'

function formatPublishedAt(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// The notices a signed-out visitor sees on the public landing page. Uses a
// cookie-free anonymous client (so RLS still decides what the public may read)
// and is cached: the landing page no longer touches the database on every
// visit — it is rebuilt at most every 5 minutes, or at once when a notice is
// published/edited (revalidateTag('notices') in lib/actions/notices.ts).
export const fetchPublicNotices = unstable_cache(
  async (): Promise<Notice[]> => {
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
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
  },
  ['public-notices'],
  { revalidate: 300, tags: ['notices'] },
)
