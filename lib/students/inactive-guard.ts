import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

/**
 * Daily attendance and marks are only for students who are currently Active. The lists already hide inactive
 * students, but a page can be open when a student is deactivated, and a request can be built by hand, so the
 * server checks too. Returns a message naming who is inactive, or null when everyone may be saved.
 * Nothing is deleted: an inactive student keeps their history and comes back by being set Active again.
 */
export async function refuseInactiveStudents(supabase: SupabaseClient<Database>, studentIds: string[]): Promise<string | null> {
  const ids = Array.from(new Set(studentIds))
  if (ids.length === 0) return null
  const { data } = await supabase.from('students').select('full_name').in('id', ids).eq('status', 'inactive')
  const names = (data ?? []).map((s) => s.full_name)
  if (names.length === 0) return null
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ` and ${names.length - 3} more` : '')
  return `${shown} ${names.length === 1 ? 'is' : 'are'} inactive, so nothing was saved. Reload the page, or set the student Active first.`
}
