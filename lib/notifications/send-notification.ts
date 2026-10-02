import 'server-only'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { TwilioProvider } from './twilio'
import { absenceAlertMessage, gradeAlertMessage } from './message-templates'
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
async function dispatch(message: string, parentPhone: string): Promise<boolean> {
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

// Twilio round-trips take seconds each, and a whole-class marks upload or
// attendance submit used to await every one of them inline — long enough to
// blow a serverless function's time limit and make the save look broken even
// though the academic rows had already committed. Runs the work after the
// response is sent (Next's after()); outside a request scope (unit tests,
// scripts) after() throws, so fall back to running inline.
export async function deferTask(task: () => Promise<unknown>): Promise<void> {
  try {
    after(async () => { try { await task() } catch { /* notification failures never surface */ } })
  } catch {
    try { await task() } catch { /* same non-blocking contract */ }
  }
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
  const { data } = await admin
    .from('parent_student_links')
    .select('student_id, parent_id, profiles(full_name, phone)')
    .in('student_id', studentIds)

  for (const row of data ?? []) {
    result.set(row.student_id, [...(result.get(row.student_id) ?? []), { id: row.parent_id, name: row.profiles?.full_name ?? '', phone: row.profiles?.phone ?? null }])
  }
  return result
}

// Writes the in-app copy of each alert — the always-available channel while
// WhatsApp/SMS can be blocked at the provider. Idempotent: an identical
// message (same parent, student, kind and text — an absence alert carries its
// date) is never inserted twice, so pressing "Resend" can't spam an inbox.
async function savePortalNotifications(rows: PortalNotificationRow[]): Promise<void> {
  if (rows.length === 0) return
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('portal_notifications')
    .select('parent_id, student_id, kind, body')
    .in('student_id', Array.from(new Set(rows.map((r) => r.studentId))))
    .in('body', Array.from(new Set(rows.map((r) => r.body))))
  const seen = new Set((existing ?? []).map((e) => `${e.parent_id}|${e.student_id}|${e.kind}|${e.body}`))

  const fresh = rows.filter((r) => !seen.has(`${r.parentId}|${r.studentId}|${r.kind}|${r.body}`))
  if (fresh.length === 0) return

  await admin.from('portal_notifications').insert(
    fresh.map((r) => ({ parent_id: r.parentId, parent_name: r.parentName, student_id: r.studentId, kind: r.kind, title: r.title, body: r.body, created_by: r.createdBy })),
  )
}

// Absence alert: saved to every linked parent's portal inbox straight away,
// WhatsApp/SMS attempted after the response. `parents` is how many portal
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
  if (phones.length > 0) await deferTask(() => Promise.all(phones.map((phone) => dispatch(message, phone))))

  return { parents: parents.length }
}

// Grade alerts for a whole batch: one parents lookup, one portal insert, then
// the external sends (a few at a time) after the response. Returns how many
// students had at least one parent to notify.
export async function queueGradeAlerts(jobs: GradeAlertJob[], createdBy: string | null): Promise<number> {
  if (jobs.length === 0) return 0

  const parentsByStudent = await getLinkedParentsBatch(jobs.map((j) => j.studentId))
  const portalRows: PortalNotificationRow[] = []
  const sends: (() => Promise<boolean>)[] = []

  for (const j of jobs) {
    const message = gradeAlertMessage(j.studentName, j.subject, j.examLabel, j.score, j.maxScore)
    for (const p of parentsByStudent.get(j.studentId) ?? []) {
      portalRows.push({ parentId: p.id, parentName: p.name, studentId: j.studentId, kind: 'grade', title: `${j.subject} result`, body: message, createdBy })
      if (p.phone) sends.push(() => dispatch(message, p.phone!))
    }
  }

  await savePortalNotifications(portalRows)

  await deferTask(async () => {
    const CONCURRENCY = 5
    for (let i = 0; i < sends.length; i += CONCURRENCY) {
      await Promise.all(sends.slice(i, i + CONCURRENCY).map((send) => send()))
    }
  })

  return jobs.filter((j) => (parentsByStudent.get(j.studentId)?.length ?? 0) > 0).length
}
