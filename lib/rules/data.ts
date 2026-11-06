import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Database } from '@/types/supabase'
import { RULES_BUCKET } from './constants'

type Db = SupabaseClient<Database>

export type RuleDoc = {
  id: string
  title: string
  description: string | null
  sort_order: number
  is_published: boolean
  published_at: string | null
  updated_at: string
  image_url: string | null
}

const COLS = 'id, title, description, storage_path, sort_order, is_published, published_at, updated_at'

// The pictures sit in a private bucket; each read gets a short-lived signed URL minted by the
// service role AFTER row-level security has already decided which rows this caller may see
// (the administration sees all, everyone else only published rows).
async function withUrls(rows: (Pick<Database['public']['Tables']['rule_documents']['Row'], 'id' | 'title' | 'description' | 'storage_path' | 'sort_order' | 'is_published' | 'published_at' | 'updated_at'>)[]): Promise<RuleDoc[]> {
  if (rows.length === 0) return []
  const { data } = await createAdminClient().storage.from(RULES_BUCKET).createSignedUrls(rows.map((r) => r.storage_path), 60 * 60)
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
  return rows.map((r) => ({
    id: r.id, title: r.title, description: r.description, sort_order: r.sort_order, is_published: r.is_published,
    published_at: r.published_at, updated_at: r.updated_at, image_url: urls.get(r.storage_path) ?? null,
  }))
}

/** Every picture, published or not, in the administration's chosen order (RLS: administration only sees unpublished). */
export async function fetchAllRules(supabaseOverride?: Db): Promise<RuleDoc[]> {
  const supabase = supabaseOverride ?? await createClient()
  const { data } = await supabase.from('rule_documents').select(COLS).order('sort_order').order('created_at')
  return withUrls(data ?? [])
}

/** What a parent sees: published pictures only. `latest` puts the most recently published first. */
export async function fetchPublishedRules(order: 'academy' | 'latest' = 'academy', supabaseOverride?: Db): Promise<RuleDoc[]> {
  const supabase = supabaseOverride ?? await createClient()
  let query = supabase.from('rule_documents').select(COLS).eq('is_published', true)
  query = order === 'latest' ? query.order('published_at', { ascending: false }) : query.order('sort_order').order('created_at')
  const { data } = await query
  return withUrls(data ?? [])
}
