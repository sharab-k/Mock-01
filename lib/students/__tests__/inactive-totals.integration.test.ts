// @vitest-environment node
//
// Live: an Inactive student is out of the dashboard totals (marks, attendance, what is owed), and counted again
// the moment they are Active — nothing is deleted either way. Needs migration 20261110100000 applied.
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient<Database>(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })

const runId = Date.now()
const SUBJECT = `ZZ Totals ${runId}`
const DAY = '2026-11-02'
let sid = '', tuition = ''

const num = (v: unknown) => Number(v ?? 0)
const setStatus = (status: 'active' | 'inactive') => admin.from('students').update({ status }).eq('id', sid)

// A grade/section nobody else uses, so other tests and real data cannot move these numbers.
async function classMarks() {
  const { data } = await admin.rpc('marks_class_stats')
  return num((data ?? []).find((r) => r.grade_level === '9' && r.section === 'B3')?.entries)
}
async function subjectMarks() {
  const { data } = await admin.rpc('marks_subject_stats')
  return num((data ?? []).find((r) => r.subject === SUBJECT)?.entries)
}
async function dayCounts() {
  const { data } = await admin.rpc('attendance_class_day', { p_date: DAY })
  return (data ?? []).filter((r) => r.grade_level === '9' && r.section === 'B3').reduce((n, r) => n + num(r.n), 0)
}
async function dayTotals() {
  const { data } = await admin.rpc('attendance_day_stats', { p_dates: [DAY] })
  return num(data?.[0]?.present)
}
const owed = async () => num((await admin.rpc('fee_overview', { p_from: DAY, p_to: DAY })).data?.[0]?.outstanding)
const owedFinance = async () => num((await admin.rpc('finance_totals', { p_from: DAY, p_to: DAY })).data?.[0]?.outstanding)

beforeAll(async () => {
  await admin.from('subjects').insert({ name: SUBJECT, grade_level: '9', type: 'compulsory' })
  const { data, error } = await admin.from('students').insert({
    full_name: `Totals Test ${runId}`, roll_number: `TT-${runId}`, registration_number: `TTR-${runId}`,
    program: 'SSC-1', grade_level: '9', section: 'B3', academic_year: 2026, tuition_fee: 4000,
  }).select('id').single()
  if (error || !data) throw error ?? new Error('student insert failed')
  sid = data.id
  tuition = (await admin.from('fee_heads').select('id').eq('name', 'Tuition').single()).data!.id
  await admin.from('marks').insert({ student_id: sid, subject: SUBJECT, exam_type: 'monthly', term: '2026-T1', exam_date: DAY, score: 15, max_score: 20 })
  await admin.from('attendance_records').insert({ student_id: sid, class_date: DAY, status: 'present' })
  await admin.from('fee_charges').insert({ student_id: sid, head_id: tuition, year: 2026, month: 11, amount: 4000, due_date: '2099-11-10' })
}, 60_000)

afterAll(async () => {
  await admin.from('marks').delete().eq('student_id', sid)
  await admin.from('students').delete().eq('id', sid)
  await admin.from('subjects').delete().eq('name', SUBJECT)
})

describe('Inactive students and the dashboard totals (live)', { timeout: 60_000 }, () => {
  it('count while the student is Active', async () => {
    expect(await classMarks()).toBe(1)
    expect(await subjectMarks()).toBe(1)
    expect(await dayCounts()).toBe(1)
    expect(await dayTotals()).toBeGreaterThanOrEqual(1)
  })

  it('an Inactive student is out of the marks, attendance and amount-owed totals', async () => {
    const owedBefore = await owed()
    const financeBefore = await owedFinance()
    await setStatus('inactive')
    expect(await classMarks()).toBe(0)
    expect(await subjectMarks()).toBe(0)
    expect(await dayCounts()).toBe(0)
    expect(await owed()).toBe(owedBefore - 4000)
    expect(await owedFinance()).toBe(financeBefore - 4000)
  })

  it('their records are all still there, untouched', async () => {
    expect((await admin.from('marks').select('score').eq('student_id', sid)).data?.[0]?.score).toBe(15)
    expect((await admin.from('attendance_records').select('status').eq('student_id', sid)).data?.[0]?.status).toBe('present')
    expect((await admin.from('fee_charges').select('amount').eq('student_id', sid)).data?.[0]?.amount).toBe(4000)
  })

  it('Active counts them again, exactly as before', async () => {
    const owedInactive = await owed()
    await setStatus('active')
    expect(await classMarks()).toBe(1)
    expect(await subjectMarks()).toBe(1)
    expect(await dayCounts()).toBe(1)
    expect(await owed()).toBe(owedInactive + 4000)
  })

  it('money actually received is never hidden by status', async () => {
    const { data: charge } = await admin.from('fee_charges').select('id').eq('student_id', sid).single()
    await admin.from('fee_receipts').insert({ student_id: sid, charge_id: charge!.id, amount: 1500, paid_on: DAY, method: 'cash' })
    const received = async () => num((await admin.rpc('fee_overview', { p_from: DAY, p_to: DAY })).data?.[0]?.collected)
    const before = await received()
    await setStatus('inactive')
    expect(await received()).toBe(before)
    await setStatus('active')
    await admin.from('fee_receipts').delete().eq('student_id', sid)
  })
})
