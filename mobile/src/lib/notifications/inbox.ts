import { supabase } from '@/lib/supabase/client';

export type InboxNotification = {
  id: string;
  kind: 'absence' | 'grade';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  studentName: string;
};

// Ported from the web's lib/notifications/inbox.ts — direct RLS-scoped reads:
// a parent session sees only their own rows (parent_read_own_notifications),
// Super Admin sees all (super_admin_read_all_notifications).
export async function fetchMyNotifications(): Promise<InboxNotification[]> {
  const { data } = await supabase
    .from('portal_notifications')
    .select('id, kind, title, body, created_at, read_at, students(full_name)')
    .order('created_at', { ascending: false })
    .limit(200);

  return (data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind as InboxNotification['kind'],
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    read: n.read_at !== null,
    studentName: n.students?.full_name ?? 'Student',
  }));
}

export async function fetchUnreadCount(): Promise<number> {
  const { count } = await supabase.from('portal_notifications').select('id', { count: 'exact', head: true }).is('read_at', null);
  return count ?? 0;
}

// The table's UPDATE policy limits this to the caller's own rows and the
// column-level grant limits it to read_at, so no parent id is passed.
export async function markAllNotificationsRead(): Promise<void> {
  await supabase.from('portal_notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
}

export type SentNotification = InboxNotification & { parentName: string; gradeLevel: string; section: string };

export async function fetchSentNotifications(): Promise<SentNotification[]> {
  const { data } = await supabase
    .from('portal_notifications')
    .select('id, kind, title, body, created_at, read_at, parent_name, students(full_name, grade_level, section)')
    .order('created_at', { ascending: false })
    .limit(500);

  return (data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind as InboxNotification['kind'],
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    read: n.read_at !== null,
    studentName: n.students?.full_name ?? 'Student',
    gradeLevel: n.students?.grade_level ?? '',
    section: n.students?.section ?? '',
    parentName: n.parent_name || 'Parent',
  }));
}

export function formatNotificationTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
