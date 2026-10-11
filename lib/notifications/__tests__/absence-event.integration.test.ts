// @vitest-environment node
//
// The "student marked absent" EVENT (trigger notify_parents_on_absence on
// attendance_records): becoming absent notifies every linked parent in their
// portal — however the row was written — exactly once, with the school's
// message, and never blocks or duplicates.
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const admin = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const runId = Date.now()
const parentIds: string[] = []
let studentId = ''
let lonelyStudentId = ''
let rollNumber = ''

const count = async (sid: string) =>
  (await admin.from('portal_notifications').select('id', { count: 'exact', head: true }).eq('student_id', sid).eq('kind', 'absence')).count ?? 0

async function mark(sid: string, date: string, status: 'present' | 'absent' | 'late') {
  const { error } = await admin.from('attendance_records').upsert({ student_id: sid, class_date: date, status }, { onConflict: 'student_id,class_date' })
  expect(error).toBeNull()
}

beforeAll(async () => {
  for (const n of ['A', 'B']) {
    const { data, error } = await admin.auth.admin.createUser({ email: `absence-evt-${n}-${runId}@jeacademy.test`, password: `Test-${runId}-!Aa1`, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('createUser failed')
    parentIds.push(data.user.id)
    await admin.from('profiles').insert({ id: data.user.id, role: 'parent', email: `absence-evt-${n}-${runId}@jeacademy.test`, full_name: `Event Parent ${n}` })
  }
  const mk = async (tag: string) => {
    const { data, error } = await admin.from('students').insert({
      roll_number: `JE-TEST-EVT-${tag}-${runId}`, registration_number: `JE-TEST-REG-EVT-${tag}-${runId}`, academic_year: 2026,
      full_name: `Event Child ${tag} `, program: 'Matriculation', grade_level: '9', section: 'A',
    }).select('id, roll_number').single()
    if (error || !data) throw error ?? new Error('student insert failed')
    return data
  }
  const s = await mk('S')
  studentId = s.id
  rollNumber = s.roll_number
  lonelyStudentId = (await mk('L')).id // no parent linked
  await admin.from('parent_student_links').insert(parentIds.map((p) => ({ parent_id: p, student_id: studentId })))
})

afterAll(async () => {
  await admin.from('students').delete().in('id', [studentId, lonelyStudentId]) // cascades attendance, links, notifications
  for (const p of parentIds) await admin.auth.admin.deleteUser(p)
})

describe('absence event (database trigger)', () => {
  it('present does not notify', async () => {
    await mark(studentId, '2026-11-02', 'present')
    expect(await count(studentId)).toBe(0)
  })

  it('present -> absent notifies EVERY linked parent, with the exact school message', async () => {
    await mark(studentId, '2026-11-02', 'absent')
    const { data } = await admin.from('portal_notifications').select('parent_id, parent_name, body, title').eq('student_id', studentId).eq('kind', 'absence')
    expect(data).toHaveLength(2)
    expect(new Set((data ?? []).map((d) => d.parent_id))).toEqual(new Set(parentIds))
    expect(data![0].title).toBe('Notification of Absence')
    expect(data![0].body).toBe(
      `Notification of Absence.\n\nDear Parents,\nEvent Child S, having GR# ${rollNumber}, is absent today (2 November 2026). Kindly ensure they cover the missed work.\n\nRegards,\nJ.E Academy.`,
    )
  })

  it('re-saving an already-absent row, or bouncing late -> absent the same day, never duplicates', async () => {
    await mark(studentId, '2026-11-02', 'absent')
    await mark(studentId, '2026-11-02', 'late')
    await mark(studentId, '2026-11-02', 'absent')
    expect(await count(studentId)).toBe(2)
  })

  it('a fresh row inserted straight as absent on another day notifies for that day', async () => {
    await mark(studentId, '2026-11-03', 'absent')
    expect(await count(studentId)).toBe(4)
  })

  it('a student with no linked parent is marked absent without error and notifies nobody', async () => {
    await mark(lonelyStudentId, '2026-11-02', 'absent')
    expect(await count(lonelyStudentId)).toBe(0)
    const { data } = await admin.from('attendance_records').select('status').eq('student_id', lonelyStudentId)
    expect(data?.[0].status).toBe('absent') // the attendance write itself is untouched
  })
})
