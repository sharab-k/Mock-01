import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Called at the end of each log-worthy Server Action, on the caller's own
// RLS-scoped session client — audit_log's insert_own_actions policy requires
// actor_id = auth.uid(), so this can never be used to log an action as
// someone else. Never throws: an audit-log failure must not roll back the
// academic record or account change it's describing, same principle as a
// failed Twilio call in lib/notifications (CLAUDE.md §7).
export async function logAction(
  supabase: SupabaseClient<Database>,
  actorId: string,
  action: string,
): Promise<void> {
  const { error } = await supabase.from('audit_log').insert({ actor_id: actorId, action })
  if (error) console.error('audit log insert failed:', error.message)
}
