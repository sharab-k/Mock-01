// @vitest-environment node
//
// Live: expenses + finance totals, fee vouchers, complaints, rules and regulations, and
// parents teacher meetings, against the real Supabase project and the dev server. Real role
// JWTs (admissions_admin, marks_admin, parents) prove the access rules; the service role sets
// up data. No Super Admin account is created from tests, so the Super Admin write paths are
// covered by the matching denial cases below plus the pure SQL rules.
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
const NIL = '00000000-0000-0000-0000-000000000000'

const roles = ['admissions_admin', 'marks_admin', 'parent', 'other_parent'] as const
type R = (typeof roles)[number]
const ids = {} as Record<R, string>
const clients = {} as Record<R, ReturnType<typeof createClient<Database>>>
const tokens = {} as Record<R, string>
let kid = '', stranger = '', tuition = ''
const cleanup = { rules: [] as string[], meetings: [] as string[], vouchers: [] as string[], expenses: [] as string[] }

async function makeUser(role: R) {
  const email = `mods-${role}-${runId}@jeacademy.test`
  const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
  if (error || !data.user) throw error ?? new Error('createUser failed')
  ids[role] = data.user.id
  await admin.from('profiles').insert({ id: data.user.id, role: role === 'other_parent' ? 'parent' : role, email, full_name: `Mods ${role}` })
  const c = createClient<Database>(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (e2 || !s.session) throw e2 ?? new Error('sign in failed')
  clients[role] = c
  tokens[role] = s.session.access_token
}

async function student(tag: string) {
  const { data, error } = await admin.from('students').insert({
    full_name: `Mods ${tag}`, roll_number: `MD-${tag}-${runId}`, registration_number: `MDR-${tag}-${runId}`,
    program: 'SSC-1', grade_level: '9', section: 'B1', academic_year: 2026, tuition_fee: 5000,
  }).select('id').single()
  if (error || !data) throw error ?? new Error('student insert failed')
  return data.id
}

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const form = (files: [string, Buffer][], titles: string[]) => {
  const f = new FormData()
  files.forEach(([name, buf]) => f.append('files', new Blob([new Uint8Array(buf)]), name))
  titles.forEach((t) => f.append('titles', t))
  return f
}

beforeAll(async () => {
  for (const r of roles) await makeUser(r)
  kid = await student('kid')
  stranger = await student('stranger')
  await admin.from('parent_student_links').insert([{ parent_id: ids.parent, student_id: kid }, { parent_id: ids.other_parent, student_id: stranger }])
  tuition = (await admin.from('fee_heads').select('id').eq('name', 'Tuition').single()).data!.id
}, 90_000)

afterAll(async () => {
  if (cleanup.rules.length) {
    const { data } = await admin.from('rule_documents').select('storage_path').in('id', cleanup.rules)
    if (data?.length) await admin.storage.from('rules-images').remove(data.map((d) => d.storage_path))
    await admin.from('rule_documents').delete().in('id', cleanup.rules)
  }
  // anything the upload route created for the test admissions admin
  const { data: made } = await admin.from('rule_documents').select('id, storage_path').eq('created_by', ids.admissions_admin)
  if (made?.length) {
    await admin.storage.from('rules-images').remove(made.map((d) => d.storage_path))
    await admin.from('rule_documents').delete().in('id', made.map((d) => d.id))
  }
  await admin.from('ptm_meetings').delete().in('id', cleanup.meetings)
  await admin.from('fee_vouchers').delete().in('student_id', [kid, stranger])
  await admin.from('fee_receipts').delete().in('student_id', [kid, stranger])
  await admin.from('expenses').delete().in('id', cleanup.expenses)
  await admin.from('students').delete().in('id', [kid, stranger]) // cascades complaints, charges, links, bookings
  for (const r of roles) await admin.auth.admin.deleteUser(ids[r])
})

describe('expenses and finance totals (live)', { timeout: 60_000 }, () => {
  let head = ''
  beforeAll(async () => { head = (await admin.from('expense_heads').select('id').eq('name', 'Other').single()).data!.id })

  it('staff cannot read or write expenses or heads', async () => {
    for (const role of ['admissions_admin', 'marks_admin', 'parent'] as const) {
      expect((await clients[role].from('expenses').select('id').limit(1)).data ?? []).toHaveLength(0)
      expect((await clients[role].from('expenses').insert({ head_id: head, payee: 'x', amount: 1 })).error).not.toBeNull()
      expect((await clients[role].from('expense_heads').insert({ name: `Hack ${runId}` })).error).not.toBeNull()
    }
  })

  it('totals count live expenses only, by day, head and payee, and never edit', async () => {
    const mk = async (payee: string, amount: number) => {
      const { data, error } = await admin.from('expenses').insert({ head_id: head, payee, amount, spent_on: '2099-02-03' }).select('id').single()
      if (error || !data) throw error ?? new Error('expense insert failed')
      cleanup.expenses.push(data.id)
      return data.id
    }
    const a = await mk(`K-Electric ${runId}`, 700)
    const b = await mk(`Mr Saleem ${runId}`, 300)
    expect((await admin.from('expenses').update({ amount: 1 }).eq('id', a)).error?.message).toMatch(/cannot be edited/)
    expect((await admin.from('expenses').update({ voided_at: new Date().toISOString(), void_reason: 'entered twice' }).eq('id', b)).error).toBeNull()
    expect((await admin.from('expenses').update({ voided_at: null }).eq('id', b)).error?.message).toMatch(/cannot be restored/)

    const t = (await admin.rpc('finance_totals', { p_from: '2099-02-01', p_to: '2099-02-28' })).data?.[0]
    expect(Number(t?.expenses)).toBe(700)
    expect(Number(t?.income)).toBe(0)
    expect(Number(t?.net)).toBe(-700)
    expect(Number(t?.expense_count)).toBe(1)

    const days = (await admin.rpc('finance_by_period', { p_from: '2099-02-01', p_to: '2099-02-28', p_unit: 'day' })).data ?? []
    expect(days).toHaveLength(1)
    expect(days[0]).toMatchObject({ period: '2099-02-03', income: 0, expenses: 700 })
    const years = (await admin.rpc('finance_by_period', { p_from: '2099-01-01', p_to: '2099-12-31', p_unit: 'year' })).data ?? []
    expect(years.map((y) => y.period)).toEqual(['2099-01-01'])
    expect((await admin.rpc('finance_by_period', { p_from: '2099-01-01', p_to: '2099-12-31', p_unit: 'week' })).data ?? []).toHaveLength(0)

    const bd = (await admin.rpc('expense_breakdown', { p_from: '2099-02-01', p_to: '2099-02-28', p_head: null as unknown as string })).data ?? []
    expect(bd.find((r) => r.kind === 'head' && r.label === 'Other')).toMatchObject({ total: 700, n: 1 })
    expect(bd.find((r) => r.kind === 'payee')?.label).toContain('K-Electric')
  })

  it('a non-Super-Admin sees zero from the finance functions (RLS hides the rows)', async () => {
    const t = (await clients.marks_admin.rpc('finance_totals', { p_from: '2099-02-01', p_to: '2099-02-28' })).data?.[0]
    expect(Number(t?.expenses)).toBe(0)
  })
})

describe('fee vouchers (live)', { timeout: 60_000 }, () => {
  let kidVoucher = '', strangerVoucher = ''

  beforeAll(async () => {
    for (const [sid, key] of [[kid, 'kid'], [stranger, 'stranger']] as const) {
      const { data: c } = await admin.from('fee_charges').insert({ student_id: sid, head_id: tuition, year: 2020, month: 4, amount: 5000, due_date: '2020-04-10' }).select('id').single()
      const { data: v } = await admin.from('fee_vouchers').insert({ student_id: sid, year: 2020, month: 4, due_date: '2020-04-10', amount: 5000 }).select('id').single()
      if (key === 'kid') { kidVoucher = v!.id; await admin.from('fee_receipts').insert({ student_id: sid, charge_id: c!.id, amount: 2000, method: 'cash' }) } else strangerVoucher = v!.id
    }
  })

  it('status is derived from the ledger (partly paid but past due = Overdue; unpaid past due = Overdue)', async () => {
    const rows = (await admin.from('fee_voucher_status').select('student_id, due, paid, outstanding, status').in('id', [kidVoucher, strangerVoucher])).data ?? []
    const k = rows.find((r) => r.student_id === kid)!
    expect(k).toMatchObject({ due: 5000, paid: 2000, outstanding: 3000, status: 'overdue' })
    expect(rows.find((r) => r.student_id === stranger)).toMatchObject({ paid: 0, outstanding: 5000, status: 'overdue' })
  })

  it('paying it off makes the voucher Paid', async () => {
    const { data: c } = await admin.from('fee_charges').select('id').eq('student_id', kid).eq('year', 2020).eq('month', 4).single()
    await admin.from('fee_receipts').insert({ student_id: kid, charge_id: c!.id, amount: 3000, method: 'cash' })
    expect((await admin.from('fee_voucher_status').select('status').eq('id', kidVoucher).single()).data?.status).toBe('paid')
  })

  it('staff and other parents cannot generate or read vouchers; a parent sees only their own', async () => {
    expect((await clients.marks_admin.rpc('fee_generate_vouchers', { p_year: 2099, p_month: 1, p_due: '2099-01-10', p_student_ids: [kid] })).error?.message).toMatch(/Not authorized/)
    expect((await clients.marks_admin.from('fee_vouchers').select('id').in('id', [kidVoucher, strangerVoucher])).data ?? []).toHaveLength(0)
    const own = (await clients.parent.from('fee_voucher_status').select('id').in('id', [kidVoucher, strangerVoucher])).data ?? []
    expect(own.map((v) => v.id)).toEqual([kidVoucher])
  })

  it('the PDF route: a parent downloads their own voucher only; bulk is Super Admin only; signed-out is refused', async () => {
    const get = (id: string, role?: R) => fetch(`${APP}/api/vouchers/pdf?id=${id}`, { headers: role ? { Authorization: `Bearer ${tokens[role]}` } : {} })
    const own = await get(kidVoucher, 'parent')
    expect(own.status).toBe(200)
    expect(own.headers.get('content-type')).toBe('application/pdf')
    expect(Buffer.from(await own.arrayBuffer()).subarray(0, 4).toString()).toBe('%PDF')
    expect((await get(strangerVoucher, 'parent')).status).toBe(404)
    expect((await get(kidVoucher)).status).toBe(401)
    const bulk = await fetch(`${APP}/api/vouchers/pdf`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.parent}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [kidVoucher] }) })
    expect(bulk.status).toBe(403)
    expect((await get('not-a-uuid', 'parent')).status).toBe(400)
  })
})

describe('complaints (live)', { timeout: 60_000 }, () => {
  let complaint = ''

  it('a parent files a complaint for their own child, starting Pending', async () => {
    const { data, error } = await clients.parent.from('complaints').insert({ student_id: kid, parent_id: ids.parent, subject: 'Bus timing', details: 'The bus is always late.' }).select('id, status, complaint_no').single()
    expect(error).toBeNull()
    expect(data?.status).toBe('pending')
    complaint = data!.id
  })

  it('a parent cannot file for another family\'s child, as someone else, or pre-resolved', async () => {
    expect((await clients.parent.from('complaints').insert({ student_id: stranger, parent_id: ids.parent, subject: 'x', details: 'y y y y y' })).error).not.toBeNull()
    expect((await clients.parent.from('complaints').insert({ student_id: kid, parent_id: ids.other_parent, subject: 'x', details: 'y y y y y' })).error).not.toBeNull()
    expect((await clients.parent.from('complaints').insert({ student_id: kid, parent_id: ids.parent, subject: 'x', details: 'y y y y y', status: 'resolved' })).error).not.toBeNull()
  })

  it('the administration records action, response and status; every change is kept in the history', async () => {
    const up = await clients.admissions_admin.from('complaints').update({ status: 'in_progress', action_taken: 'Spoke to the driver', action_date: '2026-11-06' }).eq('id', complaint).select('status').single()
    expect(up.error).toBeNull()
    expect(up.data?.status).toBe('in_progress')
    await clients.admissions_admin.from('complaints').update({ status: 'resolved', response: 'New pick-up time agreed.' }).eq('id', complaint)
    const history = (await clients.parent.from('complaint_history').select('status').eq('complaint_id', complaint).order('created_at')).data ?? []
    expect(history.map((h) => h.status)).toEqual(['pending', 'in_progress', 'resolved'])
  })

  it('the complaint text itself cannot be rewritten, even by the administration', async () => {
    const res = await clients.admissions_admin.from('complaints').update({ details: 'changed' }).eq('id', complaint)
    expect(res.error?.message).toMatch(/cannot be changed/)
  })

  it('a parent cannot update a complaint, and nobody else can see it', async () => {
    const res = await clients.parent.from('complaints').update({ status: 'resolved' }).eq('id', complaint).select()
    expect(res.data ?? []).toHaveLength(0)
    expect((await clients.other_parent.from('complaints').select('id').eq('id', complaint)).data ?? []).toHaveLength(0)
    expect((await clients.marks_admin.from('complaints').select('id').eq('id', complaint)).data ?? []).toHaveLength(0)
    expect((await clients.marks_admin.from('complaint_history').select('id').eq('complaint_id', complaint)).data ?? []).toHaveLength(0)
    expect((await clients.admissions_admin.from('complaints').select('id').eq('id', complaint)).data ?? []).toHaveLength(1)
  })
})

describe('rules and regulations (live)', { timeout: 60_000 }, () => {
  it('only the administration can add or change rules; a parent sees published ones only', async () => {
    const { data, error } = await clients.admissions_admin.from('rule_documents').insert({ title: `Dress code ${runId}`, storage_path: `test-${runId}.jpg`, sort_order: 9990 }).select('id, published_at').single()
    expect(error).toBeNull()
    expect(data?.published_at).toBeNull()
    cleanup.rules.push(data!.id)

    expect((await clients.parent.from('rule_documents').select('id').eq('id', data!.id)).data ?? []).toHaveLength(0)
    expect((await clients.parent.from('rule_documents').insert({ title: 'x', storage_path: 'x.jpg' })).error).not.toBeNull()
    expect((await clients.marks_admin.from('rule_documents').update({ title: 'hack' }).eq('id', data!.id).select()).data ?? []).toHaveLength(0)

    const pub = await clients.admissions_admin.from('rule_documents').update({ is_published: true }).eq('id', data!.id).select('published_at').single()
    expect(pub.data?.published_at).not.toBeNull()
    expect((await clients.parent.from('rule_documents').select('id').eq('id', data!.id)).data ?? []).toHaveLength(1)

    const unpub = await clients.admissions_admin.from('rule_documents').update({ is_published: false }).eq('id', data!.id).select('published_at').single()
    expect(unpub.data?.published_at).toBeNull()
    expect((await clients.parent.from('rule_documents').select('id').eq('id', data!.id)).data ?? []).toHaveLength(0)
  })

  it('uploading several pictures at once works; a non-picture, an oversized or a parent upload is refused', async () => {
    const call = (role: R | null, body: FormData) => fetch(`${APP}/api/rules`, { method: 'POST', headers: role ? { Authorization: `Bearer ${tokens[role]}` } : {}, body })

    const ok = await call('admissions_admin', form([['a.png', PNG], ['b.png', PNG]], [`Uniform ${runId}`, `Fees ${runId}`]))
    expect(ok.status).toBe(200)
    expect((await ok.json()).created).toBe(2)
    const rows = (await admin.from('rule_documents').select('title, is_published, storage_path').eq('created_by', ids.admissions_admin).like('title', `%${runId}`)).data ?? []
    expect(rows.map((r) => r.title).sort()).toEqual([`Fees ${runId}`, `Uniform ${runId}`])
    expect(rows.every((r) => r.is_published === false)).toBe(true)
    const stored = await admin.storage.from('rules-images').download(rows[0]!.storage_path)
    expect(stored.error).toBeNull()

    const fake = await call('admissions_admin', form([['evil.png', Buffer.from('MZ not an image at all')]], ['Evil']))
    expect(fake.status).toBe(400)
    const big = await call('admissions_admin', form([['big.png', Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)])]], ['Big']))
    expect(big.status).toBe(400)
    expect((await call('parent', form([['a.png', PNG]], ['x']))).status).toBe(403)
    expect((await call(null, form([['a.png', PNG]], ['x']))).status).toBe(401)
    expect((await call('admissions_admin', new FormData())).status).toBe(400)
  })

  it('a picture can be replaced and keeps its title', async () => {
    const row = (await admin.from('rule_documents').select('id, storage_path').eq('created_by', ids.admissions_admin).eq('title', `Fees ${runId}`).single()).data!
    const f = new FormData(); f.append('file', new Blob([new Uint8Array(PNG)]), 'new.png')
    const res = await fetch(`${APP}/api/rules/${row.id}/image`, { method: 'POST', headers: { Authorization: `Bearer ${tokens.admissions_admin}` }, body: f })
    expect(res.status).toBe(200)
    const after = (await admin.from('rule_documents').select('title, storage_path').eq('id', row.id).single()).data!
    expect(after.title).toBe(`Fees ${runId}`)
    expect(after.storage_path).not.toBe(row.storage_path)
    expect((await admin.storage.from('rules-images').download(row.storage_path)).error).not.toBeNull() // old file removed
  })
})

describe('parents teacher meetings (live)', { timeout: 60_000 }, () => {
  let meeting = '', slotA = '', slotB = ''

  it('the administration creates a meeting and slots; a parent sees them only once published', async () => {
    const m = await clients.admissions_admin.from('ptm_meetings').insert({ title: `PTM ${runId}`, meeting_date: '2099-03-01', briefing: 'Bring the report card.' }).select('id').single()
    expect(m.error).toBeNull()
    meeting = m.data!.id; cleanup.meetings.push(meeting)
    const s = await clients.admissions_admin.from('ptm_slots').insert([
      { meeting_id: meeting, starts_at: '2099-03-01T04:00:00Z', ends_at: '2099-03-01T04:10:00Z' },
      { meeting_id: meeting, starts_at: '2099-03-01T04:10:00Z', ends_at: '2099-03-01T04:20:00Z' },
    ]).select('id').order('id')
    expect(s.error).toBeNull()
    ;[slotA, slotB] = s.data!.map((x) => x.id)

    expect((await clients.parent.from('ptm_meetings').select('id').eq('id', meeting)).data ?? []).toHaveLength(0)
    expect((await clients.parent.from('ptm_slots').select('id').eq('meeting_id', meeting)).data ?? []).toHaveLength(0)
    await clients.admissions_admin.from('ptm_meetings').update({ is_published: true }).eq('id', meeting)
    expect((await clients.parent.from('ptm_meetings').select('id').eq('id', meeting)).data ?? []).toHaveLength(1)
    expect((await clients.parent.from('ptm_slots').select('id').eq('meeting_id', meeting)).data ?? []).toHaveLength(2)
  })

  it('a parent cannot create meetings or slots', async () => {
    expect((await clients.parent.from('ptm_meetings').insert({ title: 'x', meeting_date: '2099-01-01' })).error).not.toBeNull()
    expect((await clients.parent.from('ptm_slots').insert({ meeting_id: meeting, starts_at: '2099-03-01T05:00:00Z', ends_at: '2099-03-01T05:10:00Z' })).error).not.toBeNull()
  })

  const book = (role: R, slot: string, student: string) =>
    clients[role].from('ptm_bookings').insert({ slot_id: slot, student_id: student, parent_id: ids[role], meeting_id: NIL }).select('id, meeting_id').single()

  it('a parent books a slot for their own child; the meeting comes from the slot', async () => {
    const r = await book('parent', slotA, kid)
    expect(r.error).toBeNull()
    expect(r.data?.meeting_id).toBe(meeting)
  })

  it('a slot can be booked once; a child can hold one slot per meeting; only for your own child', async () => {
    const taken = await book('other_parent', slotA, stranger)
    expect(taken.error?.code).toBe('23505')
    expect(taken.error?.message).toContain('uq_ptm_bookings_slot')
    const second = await book('parent', slotB, kid)
    expect(second.error?.code).toBe('23505')
    expect(second.error?.message).toContain('uq_ptm_bookings_student')
    expect((await book('parent', slotB, stranger)).error).not.toBeNull()
  })

  it('a parent learns a slot is taken, never by whom; staff cannot see the bookings', async () => {
    const taken = (await clients.other_parent.rpc('ptm_taken_slots', { p_meeting: meeting })).data as unknown as string[]
    expect(taken).toEqual([slotA])
    expect((await clients.other_parent.from('ptm_bookings').select('id').eq('meeting_id', meeting)).data ?? []).toHaveLength(0)
    expect((await clients.marks_admin.from('ptm_bookings').select('id').eq('meeting_id', meeting)).data ?? []).toHaveLength(0)
    expect((await clients.admissions_admin.from('ptm_bookings').select('id').eq('meeting_id', meeting)).data ?? []).toHaveLength(1)
  })

  it('cancelling frees the slot for someone else', async () => {
    const mine = (await clients.parent.from('ptm_bookings').select('id').eq('meeting_id', meeting)).data!
    expect((await clients.other_parent.from('ptm_bookings').update({ cancelled_at: new Date().toISOString() }).eq('id', mine[0]!.id).select()).data ?? []).toHaveLength(0) // not theirs
    expect((await clients.parent.from('ptm_bookings').update({ cancelled_at: new Date().toISOString() }).eq('id', mine[0]!.id)).error).toBeNull()
    expect((await book('other_parent', slotA, stranger)).error).toBeNull()
  })

  it('an unpublished meeting cannot be booked', async () => {
    await clients.admissions_admin.from('ptm_meetings').update({ is_published: false }).eq('id', meeting)
    expect((await book('parent', slotB, kid)).error).not.toBeNull()
    expect(((await clients.other_parent.rpc('ptm_taken_slots', { p_meeting: meeting })).data as unknown as string[]) ?? []).toHaveLength(0)
  })
})
