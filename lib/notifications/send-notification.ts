import 'server-only'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TwilioProvider } from './twilio'
import { absenceAlertMessage, gradeAlertMessage } from './message-templates'
import { toE164 } from './phone'
import type { NotificationChannel } from './provider'

const provider = new TwilioProvider()

async function logResult(channel: NotificationChannel, recipient: string, payload: string, ok: boolean) {
  const admin = createAdminClient()
  await admin.from('notification_log').insert({
    channel,
    recipient,
    payload,
    status: ok ? 'sent' : 'failed',
  })
}

// WhatsApp first, SMS as the network failover (CLAUDE.md §2) — tries both
// channels for a single logical alert, logs one notification_log row per
// channel attempted. A Twilio failure here must NEVER throw: the caller
// (the attendance/marks Server Action) has already committed the academic
// record, and a notification hiccup must not roll that back or bubble up.
async function dispatch(message: string, rawPhone: string): Promise<boolean> {
  const parentPhone = toE164(rawPhone)
  if (!parentPhone) {
    // Unusable number — record it so the failure is visible, instead of sending
    // Twilio something it will only reject.
    try { await logResult('whatsapp', rawPhone, message, false) } catch { /* logging must never throw */ }
    return false
  }
  try {
    const whatsapp = await provider.send('whatsapp', parentPhone, message)
    await logResult('whatsapp', parentPhone, message, whatsapp.ok)
    if (whatsapp.ok) return true

    const sms = await provider.send('sms', parentPhone, message)
    await logResult('sms', parentPhone, message, sms.ok)
    return sms.ok
  } catch {
    // Both provider.send and logResult already catch/report their own
    // failures — this is a last-resort guard so a bug in the pipeline itself
    // can never propagate back into the attendance/marks write path.
    return false
  }
}

// Runs the external sends with a bounded wait. They used to be fully deferred
// to Next's after(), which on Vercel was not completing — attempts vanished
// without even a delivery-log row. Now the request waits for them (several at
// a time) up to a time budget, so the log reflects reality; whatever is still
// in flight at the deadline is handed to after() as a best effort rather than
// holding the response (and a whole-class marks save) hostage to a slow
// provider. Returns how many sends succeeded within the budget.
const SEND_CONCURRENCY = 10
const SEND_BUDGET_MS = 7000

export async function runSends(tasks: (() => Promise<boolean>)[]): Promise<number> {
  if (tasks.length === 0) return 0
  const queue = [...tasks]
  let sent = 0

  const workers = Array.from({ length: Math.min(SEND_CONCURRENCY, queue.length) }, async () => {
    while (queue.length > 0) {
      const task = queue.shift()!
      try { if (await task()) sent++ } catch { /* dispatch never throws; belt and braces */ }
    }
  })
  const all = Promise.all(workers)

  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<'timeout'>((resolve) => { timer = setTimeout(() => resolve('timeout'), SEND_BUDGET_MS) })
  const outcome = await Promise.race([all.then(() => 'done' as const), deadline])
  if (timer) clearTimeout(timer)

  if (outcome === 'timeout') {
    try { after(async () => { await all }) } catch { /* outside a request scope: nothing to extend */ }
  }
  return sent
}

export type GradeAlertJob = {
  studentId: string
  studentName: string
  subject: string
  examLabel: string
  score: number
  maxScore: number
}

export type LinkedParent = { id: string; name: string; phone: string | null }

type PortalNotificationRow = {
  parentId: string
  parentName: string
  studentId: string
  kind: 'absence' | 'grade'
  title: string
  body: string
  createdBy: string | null
}

// Resolves every parent linked to each student (id + phone). Uses the
// service-role client because `profiles` has no RLS policy letting staff read
// another user's row (see lib/supabase/admin.ts) — same constraint the
// admissions enrolment flow already works around.
export async function getLinkedParentsBatch(studentIds: string[]): Promise<Map<string, LinkedParent[]>> {
  const result = new Map<string, LinkedParent[]>()
  if (studentIds.length === 0) return result

  const admin = createAdminClient()
  const links = await inBatches(Array.from(new Set(studentIds)), 100, async (batch) => {
    const { data, error } = await admin
      .from('parent_student_links')
      .select('student_id, parent_id, profiles(full_name, phone)')
      .in('student_id', batch)
    if (error) throw error
    return data ?? []
  })

  for (const row of links) {
    result.set(row.student_id, [...(result.get(row.student_id) ?? []), { id: row.parent_id, name: row.profiles?.full_name ?? '', phone: row.profiles?.phone ?? null }])
  }
  return result
}

// Postgrest puts `.in()` lists in the request URL, which has a size limit; a
// whole class of ids (or long message bodies) overflows it and the query fails
// without throwing. Batch every lookup.
async function inBatches<T>(values: string[], size: number, run: (batch: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < values.length; i += size) out.push(...(await run(values.slice(i, i + size))))
  return out
}

// Writes the in-app copy of each alert — the always-available channel while
// WhatsApp/SMS can be blocked at the provider. Idempotent: an identical
// message (same parent, student, kind and text — an absence alert carries its
// date) is never inserted twice, so pressing "Resend" can't spam an inbox.
// Returns how many parents actually received a new notification; a failed
// lookup or insert throws, so callers never report "notified" for nothing.
async function savePortalNotifications(rows: PortalNotificationRow[]): Promise<number> {
  if (rows.length === 0) return 0
  const admin = createAdminClient()

  // Dedupe on student only (short ids) and compare the text in memory.
  const existing = await inBatches(Array.from(new Set(rows.map((r) => r.studentId))), 100, async (batch) => {
    const { data, error } = await admin.from('portal_notifications').select('parent_id, student_id, kind, body').in('student_id', batch)
    if (error) throw error
    return data ?? []
  })
  const seen = new Set(existing.map((e) => `${e.parent_id}|${e.student_id}|${e.kind}|${e.body}`))

  const fresh = rows.filter((r) => !seen.has(`${r.parentId}|${r.studentId}|${r.kind}|${r.body}`))
  if (fresh.length === 0) return 0

  const { error } = await admin.from('portal_notifications').insert(
    fresh.map((r) => ({ parent_id: r.parentId, parent_name: r.parentName, student_id: r.studentId, kind: r.kind, title: r.title, body: r.body, created_by: r.createdBy })),
  )
  if (error) throw error
  return fresh.length
}

// Absence alert: saved to every linked parent's portal inbox straight away,
// then WhatsApp/SMS attempted (time-boxed, always logged). `parents` is how many portal
// inboxes received it — 0 means no parent account is linked to this student.
export async function notifyAbsence(input: {
  studentId: string
  studentName: string
  rollNumber: string
  classDate: string
  createdBy: string | null
}): Promise<{ parents: number }> {
  const parents = (await getLinkedParentsBatch([input.studentId])).get(input.studentId) ?? []
  if (parents.length === 0) return { parents: 0 }

  const message = absenceAlertMessage(input.studentName, input.rollNumber, input.classDate)
  await savePortalNotifications(parents.map((p) => ({
    parentId: p.id, parentName: p.name, studentId: input.studentId, kind: 'absence', title: 'Notification of Absence', body: message, createdBy: input.createdBy,
  })))

  const phones = parents.map((p) => p.phone).filter((p): p is string => !!p)
  await runSends(phones.map((phone) => () => dispatch(message, phone)))

  return { parents: parents.length }
}

// Grade alerts for a whole batch: one parents lookup, one portal insert, then
// the external sends (several at a time, time-boxed). Returns how many
// students had at least one parent to notify.
export async function queueGradeAlerts(jobs: GradeAlertJob[], createdBy: string | null): Promise<number> {
  if (jobs.length === 0) return 0

  const studentIds = jobs.map((j) => j.studentId)
  const parentsByStudent = await getLinkedParentsBatch(studentIds)
  const rolls = await inBatches(studentIds, 100, async (batch) => {
    const { data, error } = await createAdminClient().from('students').select('id, roll_number').in('id', batch)
    if (error) throw error
    return data ?? []
  })
  const rollById = new Map(rolls.map((r) => [r.id, r.roll_number]))
  const portalRows: PortalNotificationRow[] = []
  const sends: (() => Promise<boolean>)[] = []

  for (const j of jobs) {
    const message = gradeAlertMessage(j.studentName, rollById.get(j.studentId) ?? '', j.subject, j.examLabel, j.score, j.maxScore)
    for (const p of parentsByStudent.get(j.studentId) ?? []) {
      portalRows.push({ parentId: p.id, parentName: p.name, studentId: j.studentId, kind: 'grade', title: `${j.subject} result`, body: message, createdBy })
      if (p.phone) sends.push(() => dispatch(message, p.phone!))
    }
  }

  await savePortalNotifications(portalRows)

  await runSends(sends)

  return jobs.filter((j) => (parentsByStudent.get(j.studentId)?.length ?? 0) > 0).length
}
