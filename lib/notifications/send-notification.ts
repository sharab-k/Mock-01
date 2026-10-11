import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { absenceAlertMessage, gradeAlertMessage } from './message-templates'

// Parent notifications are delivered IN-APP, to the parent's JE portal account
// (public.portal_notifications). WhatsApp/SMS via Twilio is no longer used; the
// provider adapter in ./twilio.ts + ./provider.ts is kept only as the swappable
// seam if an external channel is ever reintroduced.
//
// The "student marked absent" notification is an EVENT raised by the database
// itself (trigger notify_parents_on_absence on attendance_records) — see
// supabase/migrations/20261011120000 — so it fires however the row was written.
// notifyAbsence below is only the staff "Resend" path.

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

// Staff "Resend": (re)saves the absence notice to every linked parent's portal
// inbox. Idempotent — the automatic database event already created the same
// message, so this adds nothing unless it was somehow missing. `parents` is how many portal
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

  const message = absenceAlertMessage(input.studentName.trim(), input.rollNumber, input.classDate)
  await savePortalNotifications(parents.map((p) => ({
    parentId: p.id, parentName: p.name, studentId: input.studentId, kind: 'absence', title: 'Notification of Absence', body: message, createdBy: input.createdBy,
  })))


  return { parents: parents.length }
}

// Grade alerts for a whole batch: one parents lookup, one portal insert, then
// nothing external. Returns how many
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

  for (const j of jobs) {
    const message = gradeAlertMessage(j.studentName, rollById.get(j.studentId) ?? '', j.subject, j.examLabel, j.score, j.maxScore)
    for (const p of parentsByStudent.get(j.studentId) ?? []) {
      portalRows.push({ parentId: p.id, parentName: p.name, studentId: j.studentId, kind: 'grade', title: `${j.subject} result`, body: message, createdBy })
    }
  }

  await savePortalNotifications(portalRows)


  return jobs.filter((j) => (parentsByStudent.get(j.studentId)?.length ?? 0) > 0).length
}
