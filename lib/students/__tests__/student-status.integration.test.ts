// @vitest-environment node
//
// Live: setting a student Inactive / Active, against the real Supabase project and the dev server. The route is
// the one the phone app uses (Bearer), which runs the same server action the website calls. Inactive must take a
// student out of attendance, fee and voucher lists WITHOUT deleting anything, and Active must bring them back.
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'
import { fetchFeeRoster } from '@/lib/fees/roster'
import { fetchVoucherCandidates } from '@/lib/fees/vouchers'
import { refuseInactiveStudents } from '@/lib/students/inactive-guard'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP = process.env.CARD_TEST_URL ?? 'http://localhost:3000'

const admin = createClient<Database>(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
const runId = Date.now()
const PASSWORD = `Test-${runId}-!Aa1`

const roles = ['admissions_admin', 'marks_admin', 'attendance_admin', 'parent'] as const
type R = (typeof roles)[number]
const ids = {} as Record<R, string>
const tokens = {} as Record<R, string>
const clients = {} as Record<R, ReturnType<typeof createClient<Database>>>
let sid = ''
const NAME = `Status Test ${runId}`
const DAY = '2026-11-03'

async function setStatus(role: R, id: string, status: 'active' | 'inactive') {
  const res = await fetch(`${APP}/api/mobile/students/${id}/status`, {
    method: 'POST', headers: { Authorization: `Bearer ${tokens[role]}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ status }),
  })
  return { status: res.status, json: (await res.json()) as { ok?: boolean; error?: string } }
}
const statusOf = async () => (await admin.from('students').select('status').eq('id', sid).single()).data?.status
const roster = async () => {
  const res = await fetch(`${APP}/api/mobile/attendance/class-roster?grade=9&section=B1&date=${DAY}`, { headers: { Authorization: `Bearer ${tokens.attendance_admin}` } })
  return ((await res.json()) as { roster: { id: string }[] }).roster
}

beforeAll(async () => {
  for (const r of roles) {
    const email = `stu-status-${r}-${runId}@jeacademy.test`
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('createUser failed')
    ids[r] = data.user.id
    await admin.from('profiles').insert({ id: data.user.id, role: r, email, full_name: `Status Test ${r}` })
    const c = createClient<Database>(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password: PASSWORD })
    if (e2 || !s.session) throw e2 ?? new Error('sign in failed')
    tokens[r] = s.session.access_token
    clients[r] = c
  }
  const { data, error } = await admin.from('students').insert({
    full_name: NAME, roll_number: `ST-${runId}`, registration_number: `STR-${runId}`, gr_number: `GR-ST-${runId}`,
    program: 'SSC-1', grade_level: '9', section: 'B1', academic_year: 2026, tuition_fee: 4000,
  }).select('id').single()
  if (error || !data) throw error ?? new Error('student insert failed')
  sid = data.id
  await admin.from('attendance_records').insert({ student_id: sid, class_date: DAY, status: 'present', marked_by: ids.attendance_admin })
}, 60_000)

afterAll(async () => {
  await admin.from('audit_log').delete().in('actor_id', Object.values(ids))
  await admin.from('students').delete().eq('id', sid)
  for (const r of roles) await admin.auth.admin.deleteUser(ids[r])
})

describe('setting a student Inactive / Active (live)', { timeout: 60_000 }, () => {
  it('only the admissions staff (and Super Admin) can change it; a parent, marks or attendance staff cannot', async () => {
    for (const role of ['parent', 'marks_admin', 'attendance_admin'] as const) {
      const r = await setStatus(role, sid, 'inactive')
      expect(r.status).not.toBe(200)
      expect(await statusOf()).toBe('active')
    }
  })

  it('an unknown student is an error, not a silent success', async () => {
    const r = await setStatus('admissions_admin', '00000000-0000-4000-8000-000000000000', 'inactive')
    expect(r.json.ok).not.toBe(true)
    expect(r.json.error).toMatch(/not found/i)
  })

  it('while Active the student is on the attendance roster, the fee list and the voucher list', async () => {
    expect((await roster()).some((s) => s.id === sid)).toBe(true)
    expect((await fetchFeeRoster(2026, 11, clients.admissions_admin)).some((s) => s.id === sid)).toBe(true)
    expect((await fetchVoucherCandidates(2026, 11, clients.admissions_admin)).some((s) => s.student_id === sid)).toBe(true)
  })

  it('Inactive takes them out of attendance, fees and vouchers, keeps every record, and writes an audit entry', async () => {
    const r = await setStatus('admissions_admin', sid, 'inactive')
    expect(r.status).toBe(200)
    expect(await statusOf()).toBe('inactive')

    expect((await roster()).some((s) => s.id === sid)).toBe(false)
    expect((await fetchFeeRoster(2026, 11, clients.admissions_admin)).some((s) => s.id === sid)).toBe(false)
    expect((await fetchVoucherCandidates(2026, 11, clients.admissions_admin)).some((s) => s.student_id === sid)).toBe(false)

    // the saved history is still there
    const rows = (await admin.from('attendance_records').select('status').eq('student_id', sid).eq('class_date', DAY)).data ?? []
    expect(rows).toHaveLength(1)
    expect((await admin.from('students').select('full_name, gr_number, tuition_fee').eq('id', sid).single()).data).toMatchObject({ full_name: NAME, tuition_fee: 4000 })

    const log = (await admin.from('audit_log').select('action').eq('actor_id', ids.admissions_admin)).data ?? []
    expect(log.some((l) => l.action.includes('Marked student inactive') && l.action.includes(NAME))).toBe(true)
  })

  it('an inactive student cannot be marked present, and the server says why', async () => {
    expect(await refuseInactiveStudents(admin, [sid])).toMatch(new RegExp(`${NAME} is inactive`))
    const res = await fetch(`${APP}/api/mobile/attendance/submit`, {
      method: 'POST', headers: { Authorization: `Bearer ${tokens.attendance_admin}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ classDate: '2026-11-04', records: [{ studentId: sid, studentName: NAME, status: 'present' }] }),
    })
    expect(res.status).not.toBe(200)
    expect((await admin.from('attendance_records').select('id').eq('student_id', sid).eq('class_date', '2026-11-04')).data ?? []).toHaveLength(0)
  })

  it('their details can still be edited while inactive', async () => {
    const { error } = await clients.admissions_admin.from('students').update({ address: 'New address while inactive' }).eq('id', sid)
    expect(error).toBeNull()
    expect((await admin.from('students').select('address').eq('id', sid).single()).data?.address).toBe('New address while inactive')
    expect(await statusOf()).toBe('inactive')
  })

  it('Active brings them straight back everywhere, history intact, and is logged', async () => {
    const r = await setStatus('admissions_admin', sid, 'active')
    expect(r.status).toBe(200)
    expect(await statusOf()).toBe('active')
    expect((await roster()).find((s) => s.id === sid)).toBeTruthy()
    expect((await fetchFeeRoster(2026, 11, clients.admissions_admin)).some((s) => s.id === sid)).toBe(true)
    expect((await fetchVoucherCandidates(2026, 11, clients.admissions_admin)).some((s) => s.student_id === sid)).toBe(true)
    expect((await admin.from('attendance_records').select('id').eq('student_id', sid)).data).toHaveLength(1)
    const log = (await admin.from('audit_log').select('action').eq('actor_id', ids.admissions_admin)).data ?? []
    expect(log.some((l) => l.action.includes('Reactivated student') && l.action.includes(NAME))).toBe(true)
  })
})
