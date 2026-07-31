'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit/log'

const CATEGORIES = ['Academic', 'Event', 'Holiday', 'Admissions'] as const
const AUDIENCES = ['All', 'Students', 'Parents', 'Staff'] as const

async function requireSuperAdminCaller() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, userId: null, authorized: false as const }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return { supabase, userId: user.id, authorized: profile?.role === 'super_admin' }
}

const NoticeInputSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  category: z.enum(CATEGORIES),
  audience: z.enum(AUDIENCES),
})

export async function createNoticeAction(input: z.infer<typeof NoticeInputSchema>) {
  const parsed = NoticeInputSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid notice details.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller()
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const { data, error } = await supabase
    .from('notices')
    .insert({ ...parsed.data, published: true })
    .select('id, published_at')
    .single()
  if (error || !data) return { ok: false as const, error: 'Could not create the notice.' }

  await logAction(supabase, userId, `Published notice — ${parsed.data.title}`)

  return { ok: true as const, id: data.id, publishedAt: data.published_at }
}

const UpdateNoticeSchema = NoticeInputSchema.extend({ id: z.string().uuid() })

export async function updateNoticeAction(input: z.infer<typeof UpdateNoticeSchema>) {
  const parsed = UpdateNoticeSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid notice details.' }

  const { supabase, authorized } = await requireSuperAdminCaller()
  if (!authorized) return { ok: false as const, error: 'Not authorized.' }

  const { id, ...fields } = parsed.data
  const { error } = await supabase.from('notices').update(fields).eq('id', id)
  if (error) return { ok: false as const, error: 'Could not update the notice.' }
  return { ok: true as const }
}

const SetPublishedSchema = z.object({ id: z.string().uuid(), published: z.boolean() })

export async function setNoticePublishedAction(input: z.infer<typeof SetPublishedSchema>) {
  const parsed = SetPublishedSchema.safeParse(input)
  if (!parsed.success) return { ok: false as const, error: 'Invalid request.' }

  const { supabase, userId, authorized } = await requireSuperAdminCaller()
  if (!authorized || !userId) return { ok: false as const, error: 'Not authorized.' }

  const { data, error } = await supabase
    .from('notices')
    .update({ published: parsed.data.published })
    .eq('id', parsed.data.id)
    .select('title')
    .single()
  if (error) return { ok: false as const, error: 'Could not update publish status.' }

  await logAction(supabase, userId, `${parsed.data.published ? 'Published' : 'Unpublished'} notice — ${data?.title ?? parsed.data.id}`)

  return { ok: true as const }
}
