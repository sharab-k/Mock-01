import { createClient } from '@/lib/supabase/server'

export type InboxNotification = {
  id: string
  kind: 'absence' | 'grade'
  title: string
  body: string
  createdAt: string
  read: boolean
  studentName: string
}

// The signed-in parent's own in-app notifications, newest first. RLS
// (parent_read_own_notifications) is what scopes this — no parent id is
// passed or trusted here.
export async function fetchMyNotifications(): Promise<InboxNotification[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('portal_notifications')
    .select('id, kind, title, body, created_at, read_at, students(full_name)')
    .order('created_at', { ascending: false })
    .limit(200)

  return (data ?? []).map((n) => ({
    id: n.id,
    kind: n.kind as InboxNotification['kind'],
    title: n.title,
    body: n.body,
    createdAt: n.created_at,
    read: n.read_at !== null,
    studentName: n.students?.full_name ?? 'Student',
  }))
}

export type SentNotification = InboxNotification & {
  parentName: string
  gradeLevel: string
  section: string
}

// Everything that has been sent to any parent portal — Super Admin only
// (super_admin_read_all_notifications is the real gate; a parent session
// calling this would just get their own rows).
export async function fetchSentNotifications(): Promise<SentNotification[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('portal_notifications')
    .select('id, kind, title, body, created_at, read_at, parent_name, students(full_name, grade_level, section)')
    .order('created_at', { ascending: false })
    .limit(500)

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
  }))
}
