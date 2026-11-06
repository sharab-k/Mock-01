// @vitest-environment node
//
// Live: the fees ledger against the real Supabase project. Role JWTs prove who can
// write and who can read; the service-role client sets up data and exercises the
// ledger rules (balance view, immutability, void, the monthly-flag sync trigger).
//
// Not covered live: the Super Admin write path (recordPayment, generateMonthlyCharges…).
// No privileged account is created in the production project from tests, so those run
// as the same SQL under the Super Admin policy, which the denied-role cases below
// bracket from the other side.
import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient<Database>(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
const runId = Date.now()
const PASSWORD = `Test-${runId}-!Aa1`

const roles = ['marks_admin', 'attendance_admin', 'admissions_admin', 'parent', 'other_parent'] as const
type R = (typeof roles)[number]
const ids = {} as Record<R, string>
const clients = {} as Record<R, ReturnType<typeof createClient<Database>>>
let kid = '', stranger = '', tuitionId = '', otherHeadId = ''
let charge = '', strangerCharge = ''

async function signIn(role: R) {
  const email = `fees-${role}-${runId}@jeacademy.test`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  ids[role] = data.user.id
  const profileRole = role === 'other_parent' ? 'parent' : role
  await admin.from('profiles').insert({ id: data.user.id, role: profileRole, email, full_name: `Fees Test ${role}` })
  const c = createClient<Database>(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error: e2 } = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (e2) throw e2
  clients[role] = c
}

async function student(tag: string, fee: number | null) {
  const { data, error } = await admin.from('students').insert({
    full_name: `Fees ${tag}`, roll_number: `FE-${tag}-${runId}`, registration_number: `FER-${tag}-${runId}`,
    program: 'SSC-1', grade_level: '9', section: 'B1', academic_year: 2026, tuition_fee: fee,
  }).select('id').single()
  if (error || !data) throw error ?? new Error('student insert failed')
  return data.id
}

async function newCharge(studentId: string, amount: number, month: number, due: string | null, headId = tuitionId) {
  const { data, error } = await admin.from('fee_charges').insert({ student_id: studentId, head_id: headId, year: 2026, month, amount, due_date: due }).select('id').single()
  if (error || !data) throw error ?? new Error('charge insert failed')
  return data.id
}

const balance = async (chargeId: string) =>
  (await admin.from('fee_charge_balances').select('due, paid, outstanding, status').eq('charge_id', chargeId).single()).data!
const monthFlag = async (studentId: string, month: number) =>
  (await admin.from('fee_payments').select('status').eq('student_id', studentId).eq('year', 2026).eq('month', month).maybeSingle()).data?.status

beforeAll(async () => {
  for (const r of roles) await signIn(r)
  const heads = (await admin.from('fee_heads').select('id, name')).data ?? []
  tuitionId = heads.find((h) => h.name === 'Tuition')!.id
  otherHeadId = heads.find((h) => h.name === 'Examination')!.id
  kid = await student('kid', 6000)
  stranger = await student('stranger', 5000)
  await admin.from('parent_student_links').insert([{ parent_id: ids.parent, student_id: kid }, { parent_id: ids.other_parent, student_id: stranger }])
  charge = await newCharge(kid, 6000, 3, '2099-03-10')
  strangerCharge = await newCharge(stranger, 5000, 3, '2099-03-10')
}, 90_000)

afterAll(async () => {
  // receipts restrict deleting their charge, so clear receipts first, then the students cascade the rest
  await admin.from('fee_receipts').delete().in('student_id', [kid, stranger])
  await admin.from('students').delete().in('id', [kid, stranger])
  for (const r of roles) await admin.auth.admin.deleteUser(ids[r])
})

describe('fees ledger (live)', { timeout: 60_000 }, () => {
  it('seeds the standard fee heads', async () => {
    const names = ((await admin.from('fee_heads').select('name')).data ?? []).map((h) => h.name)
    expect(names).toEqual(expect.arrayContaining(['Tuition', 'Admission', 'Registration', 'Examination', 'Other']))
  })

  it('an unpaid charge in the future is Unpaid and fully outstanding', async () => {
    expect(await balance(charge)).toMatchObject({ due: 6000, paid: 0, outstanding: 6000, status: 'unpaid' })
  })

  it('a part payment makes it Partially Paid, and the monthly flag stays unpaid', async () => {
    await admin.from('fee_receipts').insert({ student_id: kid, charge_id: charge, amount: 2500, method: 'cash' })
    expect(await balance(charge)).toMatchObject({ paid: 2500, outstanding: 3500, status: 'partially_paid' })
    expect(await monthFlag(kid, 3)).toBe('unpaid')
  })

  it('paying the rest makes it Paid and flips the monthly flag the phone app reads', async () => {
    await admin.from('fee_receipts').insert({ student_id: kid, charge_id: charge, amount: 3500, method: 'bank_transfer', reference: 'TX-1' })
    expect(await balance(charge)).toMatchObject({ paid: 6000, outstanding: 0, status: 'paid' })
    expect(await monthFlag(kid, 3)).toBe('paid')
  })

  it('a receipt cannot be edited, only voided', async () => {
    const { data: r } = await admin.from('fee_receipts').select('id').eq('charge_id', charge).eq('amount', 3500).single()
    const edit = await admin.from('fee_receipts').update({ amount: 1 }).eq('id', r!.id)
    expect(edit.error?.message).toMatch(/cannot be edited/)
  })

  it('voiding a receipt reopens the balance and flips the flag back; a void cannot be undone', async () => {
    const { data: r } = await admin.from('fee_receipts').select('id').eq('charge_id', charge).eq('amount', 3500).single()
    const v = await admin.from('fee_receipts').update({ voided_at: new Date().toISOString(), void_reason: 'entered twice' }).eq('id', r!.id)
    expect(v.error).toBeNull()
    expect(await balance(charge)).toMatchObject({ paid: 2500, outstanding: 3500, status: 'partially_paid' })
    expect(await monthFlag(kid, 3)).toBe('unpaid')
    const undo = await admin.from('fee_receipts').update({ voided_at: null }).eq('id', r!.id)
    expect(undo.error?.message).toMatch(/cannot be restored/)
  })

  it('a charge past its due date with money owing is Overdue', async () => {
    const c = await newCharge(kid, 4000, 1, '2026-01-10')
    expect((await balance(c)).status).toBe('overdue')
  })

  it('a zero-amount charge counts as Paid', async () => {
    const free = await student('free', null)
    const c = await newCharge(free, 0, 4, '2099-04-10')
    expect((await balance(c)).status).toBe('paid')
    await admin.from('students').delete().eq('id', free)
  })

  it('a receipt must belong to the charge\'s own student', async () => {
    const res = await admin.from('fee_receipts').insert({ student_id: stranger, charge_id: charge, amount: 100, method: 'cash' })
    expect(res.error?.message).toMatch(/does not match/)
  })

  it('one live monthly charge per student, head and month', async () => {
    const dup = await admin.from('fee_charges').insert({ student_id: kid, head_id: tuitionId, year: 2026, month: 3, amount: 1 })
    expect(dup.error?.code).toBe('23505')
  })

  it('a discount cannot exceed the amount', async () => {
    const res = await admin.from('fee_charges').insert({ student_id: kid, head_id: otherHeadId, year: 2026, amount: 100, discount: 200 })
    expect(res.error).not.toBeNull()
  })

  it('fee_overview counts receipts in the date range from SQL', async () => {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await admin.rpc('fee_overview', { p_from: today, p_to: today })
    expect(Number(data?.[0]?.collected)).toBeGreaterThanOrEqual(2500)
    expect(Number(data?.[0]?.receipt_count)).toBeGreaterThanOrEqual(1)
  })
})

describe('fees access control (live, real role JWTs)', { timeout: 60_000 }, () => {
  it.each(['marks_admin', 'attendance_admin', 'admissions_admin', 'parent'] as const)('%s cannot add a charge', async (role) => {
    const res = await clients[role].from('fee_charges').insert({ student_id: kid, head_id: otherHeadId, year: 2026, amount: 10 })
    expect(res.error).not.toBeNull()
  })

  it.each(['marks_admin', 'attendance_admin', 'admissions_admin', 'parent'] as const)('%s cannot record a payment', async (role) => {
    const res = await clients[role].from('fee_receipts').insert({ student_id: kid, charge_id: charge, amount: 10, method: 'cash' })
    expect(res.error).not.toBeNull()
  })

  it('a parent cannot void or edit a receipt', async () => {
    const { data: r } = await admin.from('fee_receipts').select('id').eq('charge_id', charge).is('voided_at', null).limit(1).single()
    const res = await clients.parent.from('fee_receipts').update({ voided_at: new Date().toISOString() }).eq('id', r!.id).select()
    expect(res.data ?? []).toHaveLength(0)
    expect((await admin.from('fee_receipts').select('voided_at').eq('id', r!.id).single()).data?.voided_at).toBeNull()
  })

  it('nobody but a Super Admin can edit fee heads', async () => {
    const res = await clients.marks_admin.from('fee_heads').update({ name: 'Hacked' }).eq('id', tuitionId).select()
    expect(res.data ?? []).toHaveLength(0)
    expect((await admin.from('fee_heads').select('name').eq('id', tuitionId).single()).data?.name).toBe('Tuition')
  })

  it('a non-Super-Admin cannot generate monthly charges', async () => {
    const res = await clients.marks_admin.rpc('fee_generate_monthly_charges', { p_year: 2099, p_month: 1, p_due: '2099-01-10' })
    expect(res.error?.message).toMatch(/Not authorized/)
  })

  it('staff roles cannot read fee charges or receipts at all', async () => {
    for (const role of ['marks_admin', 'attendance_admin', 'admissions_admin'] as const) {
      expect((await clients[role].from('fee_charges').select('id').eq('student_id', kid)).data ?? []).toHaveLength(0)
      expect((await clients[role].from('fee_receipts').select('id').eq('student_id', kid)).data ?? []).toHaveLength(0)
    }
  })

  it('a parent sees their own child\'s charges and live receipts, never another family\'s', async () => {
    const own = await clients.parent.from('fee_charges').select('id, student_id').in('student_id', [kid, stranger])
    expect(new Set((own.data ?? []).map((c) => c.student_id))).toEqual(new Set([kid]))
    const bal = await clients.parent.from('fee_charge_balances').select('charge_id').in('charge_id', [charge, strangerCharge])
    expect((bal.data ?? []).map((b) => b.charge_id)).toEqual([charge])
    const rec = await clients.parent.from('fee_receipts').select('student_id, voided_at').in('student_id', [kid, stranger])
    expect((rec.data ?? []).every((r) => r.student_id === kid && r.voided_at === null)).toBe(true)
  })
})
