import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildMessages, sendPush } from '@/lib/push/expo'

export const runtime = 'nodejs'
export const maxDuration = 30

const BodySchema = z.object({ notificationId: z.string().uuid() })

function secretMatches(given: string | null): boolean {
  const expected = process.env.PUSH_WEBHOOK_SECRET
  if (!expected || !given) return false
  const a = Buffer.from(given)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Called by the database (pg_net, from the trigger on portal_notifications) the
// moment a notification row is created. Not a user-facing route: it is
// authenticated by a shared secret, then pushes that one notification to every
// phone the parent has registered. Always answers 200 once the secret checks out
// so the database never retries; failures are counted in the response.
export async function POST(request: Request) {
  if (!secretMatches(request.headers.get('x-push-secret'))) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 })
  }
  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: notice } = await admin
    .from('portal_notifications')
    .select('id, parent_id, student_id, kind, title, body')
    .eq('id', parsed.data.notificationId)
    .maybeSingle()
  if (!notice) return NextResponse.json({ sent: 0, failed: 0, note: 'notification not found' })

  const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', notice.parent_id)
  const list = (tokens ?? []).map((t) => t.token)
  if (list.length === 0) return NextResponse.json({ sent: 0, failed: 0, note: 'no registered phones' })

  const result = await sendPush(buildMessages(list, {
    id: notice.id,
    kind: notice.kind,
    title: notice.title,
    body: notice.body,
    studentId: notice.student_id,
  }))
  if (result.dead.length > 0) await admin.from('push_tokens').delete().in('token', result.dead)

  return NextResponse.json({ sent: result.sent, failed: result.failed, removed: result.dead.length })
}
