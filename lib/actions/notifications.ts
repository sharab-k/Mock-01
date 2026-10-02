'use server'

import { createClient } from '@/lib/supabase/server'

// Marks every unread notification in the signed-in parent's inbox as read.
// Runs on the caller's own session: the table's UPDATE policy limits it to
// their own rows and the column-level grant limits it to read_at, so there's
// nothing here to trust beyond RLS.
export async function markAllNotificationsReadAction(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { error } = await supabase
    .from('portal_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('parent_id', user.id)
    .is('read_at', null)

  return { ok: !error }
}
