// @vitest-environment node
//
// Live: a marks CSV posted to /api/uploads/marks with a real marks_admin JWT —
// the same call the web popup and the phone app make. Needs the dev server.
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP = process.env.CARD_TEST_URL ?? 'http://localhost:3000'

const admin = createClient<Database>(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
const runId = Date.now()
const PASSWORD = `Test-${runId}-!Aa1`
const roles = ['marks_admin', 'parent'] as const
type R = (typeof roles)[number]
const ids = {} as Record<R, string>
const tokens = {} as Record<R, string>
const studentIds: string[] = []
const GR = [`ZT ${runId}1`, `ZT ${runId}2`]
const SUBJECT = `ZZ Test Subject ${runId}`
const month = new Date().toISOString().slice(0, 7)
const otherMonth = month === '2020-01' ? '2020-02' : '2020-01'

const csv = (rows: string[]) => `GR No,Subject,Marks,Total,Exam Date\r\n${rows.join('\r\n')}\r\n`

async function upload(role: R, text: string | null, fields: Record<string, string> = {}) {
  const form = new FormData()
  if (text !== null) form.append('file', new File([text], 'marks.csv', { type: 'text/csv' }))
  for (const [k, v] of Object.entries(fields)) form.append(k, v)
  const res = await fetch(`${APP}/api/uploads/marks`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${tokens[role]}` } })
  return { status: res.status, body: (await res.json()) as { mode: string; toSave: number; inserted: number; updated: number; errors: unknown[] } }
}
const stored = async () =>
  (await admin.from('marks').select('student_id, score, max_score, exam_type').eq('subject', SUBJECT).in('student_id', studentIds)).data ?? []

beforeAll(async () => {
  for (const r of roles) {
    const email = `marks-up-${r}-${runId}@jeacademy.test`
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('createUser failed')
    ids[r] = data.user.id
    await admin.from('profiles').insert({ id: data.user.id, role: r, email, full_name: `Marks Up ${r}` })
    const c = createClient<Database>(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password: PASSWORD })
    if (e2 || !s.session) throw e2 ?? new Error('sign in failed')
    tokens[r] = s.session.access_token
  }
  await admin.from('subjects').insert({ name: SUBJECT, grade_level: '9', type: 'compulsory' })
  for (let i = 0; i < 2; i++) {
    const { data, error } = await admin.from('students').insert({
      full_name: `Marks Upload Test ${i}`, roll_number: `ZT${runId}${i}`, registration_number: `ZTR${runId}${i}`,
      program: 'Science', grade_level: '9', section: 'B1', academic_year: 2026, gr_number: GR[i],
    }).select('id').single()
    if (error || !data) throw error ?? new Error('student insert failed')
    studentIds.push(data.id)
  }
}, 60_000)

afterAll(async () => {
  await admin.from('marks').delete().in('student_id', studentIds)
  await admin.from('tests').delete().eq('title', SUBJECT)
  await admin.from('students').delete().in('id', studentIds)
  await admin.from('subjects').delete().eq('name', SUBJECT)
  for (const r of roles) await admin.auth.admin.deleteUser(ids[r])
})

describe('marks CSV upload route (live)', { timeout: 60_000 }, () => {
  const day = `${month}-01`
  const good = () => csv([`${GR[0]},${SUBJECT},17,20,${day}`, `${GR[1].replace(' ', '')},${SUBJECT},12,20,${day}`])

  it('refuses a parent and a missing file', async () => {
    expect((await upload('parent', good(), { examType: 'monthly' })).status).toBe(403)
    expect((await upload('marks_admin', null, { examType: 'monthly' })).status).toBe(400)
    expect((await upload('marks_admin', good(), {})).status).toBe(400)
  })

  it('accepts a real exam month and rejects a malformed one', async () => {
    const ok = await upload('marks_admin', good(), { examType: 'monthly', dryRun: '1', examMonth: month })
    expect(ok.status).toBe(200)
    expect((await upload('marks_admin', good(), { examType: 'monthly', dryRun: '1', examMonth: 'banana' })).status).toBe(400)
  })

  it('a preview finds the marks but writes nothing', async () => {
    const r = await upload('marks_admin', good(), { examType: 'monthly', dryRun: '1' })
    expect(r.status).toBe(200)
    expect(r.body.mode).toBe('preview')
    expect(r.body.toSave).toBe(2)
    expect(r.body.errors).toEqual([])
    expect(await stored()).toHaveLength(0)
  })

  it('saves, then re-uploading corrected marks updates instead of duplicating', async () => {
    const saved = await upload('marks_admin', good(), { examType: 'monthly', examMonth: month })
    expect(saved.status).toBe(200)
    expect(saved.body.mode).toBe('saved')
    expect(saved.body.inserted).toBe(2)
    const rows = await stored()
    expect(rows.map((m) => m.score).sort()).toEqual([12, 17])
    expect(rows.every((m) => m.exam_type === 'monthly' && m.max_score === 20)).toBe(true)

    const again = await upload('marks_admin', csv([`${GR[0]},${SUBJECT},19,20,${day}`]), { examType: 'monthly', examMonth: month })
    expect(again.body.updated).toBe(1)
    expect(again.body.inserted).toBe(0)
    const after = await stored()
    expect(after).toHaveLength(2)
    expect(after.map((m) => m.score).sort()).toEqual([12, 19])
  })

  it('reports bad rows and a date outside the chosen month without saving them', async () => {
    const bad = csv([`NOPE 1,${SUBJECT},10,20,${day}`, `${GR[1]},${SUBJECT},99,20,${day}`, `${GR[1]},${SUBJECT},10,20,${otherMonth}-05`])
    const r = await upload('marks_admin', bad, { examType: 'half_yearly', examMonth: month })
    expect(r.status).toBe(200)
    expect(r.body.toSave).toBe(0)
    expect(r.body.errors.length).toBe(3)
    expect((await stored()).filter((m) => m.exam_type === 'half_yearly')).toHaveLength(0)
  })
})
