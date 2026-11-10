// @vitest-environment node
//
// Live: the ID-card routes against the dev server + real Supabase project, called
// with real role JWTs (Bearer). Parent uploads once; second upload is refused;
// another parent and non-card roles are refused; Super Admin can replace.
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { PDFDocument } from 'pdf-lib'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Database } from '@/types/supabase'

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const APP = process.env.CARD_TEST_URL ?? 'http://localhost:3000'

const admin = createClient<Database>(URL_, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })
const runId = Date.now()
const PASSWORD = `Test-${runId}-!Aa1`
const roles = ['super_admin', 'marks_admin', 'parent', 'other_parent'] as const
type R = (typeof roles)[number]
const ids = {} as Record<R, string>
const tokens = {} as Record<R, string>
let studentId = ''

const png = (color: string) =>
  sharp({ create: { width: 800, height: 600, channels: 3, background: color } }).png().toBuffer()

async function post(role: R, body: Buffer | null, type = 'image/png') {
  const form = new FormData()
  if (body) form.append('file', new Blob([new Uint8Array(body)], { type }), 'p.png')
  return fetch(`${APP}/api/students/${studentId}/photo`, { method: 'POST', body: form, headers: { Authorization: `Bearer ${tokens[role]}` } })
}
const bulk = (role: R | null, body: unknown) =>
  fetch(`${APP}/api/students/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}) },
    body: JSON.stringify(body),
  })
const group = (role: R | null, method: 'GET' | 'POST', body?: unknown, id = studentId) =>
  fetch(`${APP}/api/students/${id}/group`, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(role ? { Authorization: `Bearer ${tokens[role]}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
const storedGroup = async () => (await admin.from('students').select('card_group').eq('id', studentId).single()).data?.card_group
const get = (role: R, what: 'photo' | 'card') =>
  fetch(`${APP}/api/students/${studentId}/${what}`, { headers: { Authorization: `Bearer ${tokens[role]}` } })

beforeAll(async () => {
  for (const r of roles) {
    const email = `card-test-${r}-${runId}@jeacademy.test`
    const { data, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true })
    if (error || !data.user) throw error ?? new Error('createUser failed')
    ids[r] = data.user.id
    await admin.from('profiles').insert({ id: data.user.id, role: r === 'other_parent' ? 'parent' : r, email, full_name: `Card Test ${r}` })
    const c = createClient<Database>(URL_, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: s, error: e2 } = await c.auth.signInWithPassword({ email, password: PASSWORD })
    if (e2 || !s.session) throw e2 ?? new Error('sign in failed')
    tokens[r] = s.session.access_token
  }
  const { data: st, error } = await admin.from('students').insert({
    full_name: 'Card Test Student', roll_number: `CT${runId}`, registration_number: `CTR${runId}`,
    program: 'Science', grade_level: '9', section: 'B1', academic_year: 2026, gr_number: 'CT 1',
  }).select('id').single()
  if (error || !st) throw error ?? new Error('student insert failed')
  studentId = st.id
  await admin.from('parent_student_links').insert({ parent_id: ids.parent, student_id: studentId })
  await admin.from('profiles').update({ phone: '0300 1234567' }).eq('id', ids.parent)
}, 60_000)

afterAll(async () => {
  const { data: files } = await admin.storage.from('student-photos').list(studentId)
  if (files?.length) await admin.storage.from('student-photos').remove(files.map((f) => `${studentId}/${f.name}`))
  await admin.from('audit_log').delete().in('actor_id', Object.values(ids))
  await admin.from('parent_student_links').delete().eq('student_id', studentId)
  await admin.from('students').delete().eq('id', studentId)
  for (const r of roles) await admin.auth.admin.deleteUser(ids[r])
})

describe('student ID card routes (live)', { timeout: 60_000 }, () => {
  it('no card is made until a group is chosen: the card is refused and the options for the class are offered', async () => {
    expect(await storedGroup()).toBeNull()
    for (const role of ['parent', 'super_admin'] as const) {
      const res = await get(role, 'card')
      expect(res.status).toBe(409)
      const body = (await res.json()) as { code: string; options: string[] }
      expect(body.code).toBe('group_required')
      expect(body.options).toEqual(['Biology', 'Engineering']) // class 9
    }
  })

  it('a bulk download is refused too, and names the student who still needs a group', async () => {
    const res = await bulk('super_admin', { ids: [studentId] })
    expect(res.status).toBe(409)
    const body = (await res.json()) as { code: string; missing: { id: string; name: string }[] }
    expect(body.code).toBe('group_required')
    expect(body.missing).toEqual([{ id: studentId, name: 'Card Test Student', roll: `CT${runId}` }])
  })

  it('the group route: options by class, open to the linked parent while unset, and closed to everyone else', async () => {
    const info = (await (await group('parent', 'GET')).json()) as { group: string | null; options: string[]; canChange: boolean }
    expect(info).toEqual({ group: null, options: ['Biology', 'Engineering'], canChange: true })
    expect((await group('other_parent', 'GET')).status).toBe(403)
    expect((await group('marks_admin', 'GET')).status).toBe(403)
    expect((await group(null, 'GET')).status).toBe(401)
    expect((await group('other_parent', 'POST', { group: 'Biology' })).status).toBe(403)
    expect((await group('marks_admin', 'POST', { group: 'Biology' })).status).toBe(403)
    expect((await group(null, 'POST', { group: 'Biology' })).status).toBe(401)
    expect(await storedGroup()).toBeNull()
  })

  it('a group that does not belong to the class, or no group at all, is refused', async () => {
    for (const bad of ['Commerce', 'Pre-Medical', 'General Science', 'Nonsense']) {
      const res = await group('parent', 'POST', { group: bad })
      expect(res.status).toBe(400)
      expect(((await res.json()) as { error: string }).error).toMatch(/Biology, Engineering/)
    }
    expect((await group('parent', 'POST', {})).status).toBe(400)
    expect(await storedGroup()).toBeNull()
  })

  it('the linked parent chooses the group once; after that only the Super Admin can change it', async () => {
    const first = await group('parent', 'POST', { group: 'Biology' })
    expect(first.status).toBe(200)
    expect(await storedGroup()).toBe('Biology')

    const again = await group('parent', 'POST', { group: 'Engineering' })
    expect(again.status).toBe(409)
    expect(await storedGroup()).toBe('Biology')
    const info = (await (await group('parent', 'GET')).json()) as { group: string; canChange: boolean }
    expect(info).toMatchObject({ group: 'Biology', canChange: false })

    expect((await group('super_admin', 'POST', { group: 'Engineering' })).status).toBe(200)
    expect(await storedGroup()).toBe('Engineering')
    expect(((await (await group('super_admin', 'GET')).json()) as { canChange: boolean }).canChange).toBe(true)
    expect((await group('super_admin', 'POST', { group: 'Biology' })).status).toBe(200)
    expect(await storedGroup()).toBe('Biology')
  })

  it('two parents-side requests racing for the first choice: exactly one wins', async () => {
    await admin.from('students').update({ card_group: null }).eq('id', studentId)
    const [a, b] = await Promise.all([group('parent', 'POST', { group: 'Biology' }), group('parent', 'POST', { group: 'Engineering' })])
    expect([a.status, b.status].sort()).toEqual([200, 409])
    await admin.from('students').update({ card_group: 'Biology' }).eq('id', studentId)
  })

  it('a group that no longer fits the class (the student moved up) counts as not chosen', async () => {
    await admin.from('students').update({ grade_level: '11' }).eq('id', studentId)
    expect((await get('super_admin', 'card')).status).toBe(409)
    expect(((await (await group('super_admin', 'GET')).json()) as { options: string[] }).options).toContain('Pre-Engineering')
    await admin.from('students').update({ grade_level: '9' }).eq('id', studentId)
  })

  it('the choice is written to the audit log', async () => {
    const log = (await admin.from('audit_log').select('action').in('actor_id', [ids.parent, ids.super_admin])).data ?? []
    expect(log.some((l) => l.action.includes('ID card group') && l.action.includes('Card Test Student'))).toBe(true)
  })

  it('once the group is chosen, the card downloads as a PDF even before any photo exists', async () => {
    const res = await get('parent', 'card')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-')
  })

  it('a parent not linked to the child, and non-card roles, are refused', async () => {
    expect((await get('other_parent', 'card')).status).toBe(403)
    expect((await get('marks_admin', 'card')).status).toBe(403)
    expect((await post('other_parent', await png('#336699'))).status).toBe(403)
    expect((await get('other_parent', 'photo')).status).toBe(403)
  })

  it('rejects a non-image upload', async () => {
    const res = await post('parent', Buffer.from('not an image at all'), 'image/png')
    expect(res.status).toBe(400)
  })

  it('the linked parent can upload once, then is refused', async () => {
    expect((await post('parent', await png('#336699'))).status).toBe(200)
    const second = await post('parent', await png('#993333'))
    expect(second.status).toBe(409)
    const photo = await get('parent', 'photo')
    expect(photo.status).toBe(200)
    expect(photo.headers.get('content-type')).toBe('image/jpeg')
    const meta = await sharp(Buffer.from(await photo.arrayBuffer())).metadata()
    expect([meta.width, meta.height]).toEqual([600, 720])
  })

  it('two parallel first uploads: exactly one wins', async () => {
    const { data: cur } = await admin.from('students').select('photo_path').eq('id', studentId).single()
    if (cur?.photo_path) await admin.storage.from('student-photos').remove([cur.photo_path])
    await admin.from('students').update({ photo_path: null }).eq('id', studentId)
    const [a, b] = await Promise.all([post('parent', await png('#112233')), post('parent', await png('#445566'))])
    expect([a.status, b.status].sort()).toEqual([200, 409])
  })

  it('the Super Admin can replace the photo and download the card', async () => {
    const before = (await admin.from('students').select('photo_path').eq('id', studentId).single()).data?.photo_path
    expect((await post('super_admin', await png('#228833'))).status).toBe(200)
    const after = (await admin.from('students').select('photo_path').eq('id', studentId).single()).data?.photo_path
    expect(after).toBeTruthy()
    expect(after).not.toBe(before)
    expect((await get('super_admin', 'card')).status).toBe(200)
  })

  it('the card also renders with the father, group and registration details on file', async () => {
    const res = await get('super_admin', 'card')
    expect(res.status).toBe(200)
    expect((await PDFDocument.load(new Uint8Array(await res.arrayBuffer()))).getPageCount()).toBe(2)
  })
})

describe('bulk ID cards (live)', { timeout: 60_000 }, () => {
  it('the Super Admin gets one PDF with a front and back page per student', async () => {
    const res = await bulk('super_admin', { ids: [studentId] })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    const doc = await PDFDocument.load(new Uint8Array(await res.arrayBuffer()))
    expect(doc.getPageCount()).toBe(2)
  })

  it('a repeated id is printed once', async () => {
    const res = await bulk('super_admin', { ids: [studentId, studentId] })
    expect((await PDFDocument.load(new Uint8Array(await res.arrayBuffer()))).getPageCount()).toBe(2)
  })

  it('parents and other staff are refused, and so is a request with no sign-in', async () => {
    expect((await bulk('parent', { ids: [studentId] })).status).toBe(403)
    expect((await bulk('marks_admin', { ids: [studentId] })).status).toBe(403)
    expect((await bulk(null, { ids: [studentId] })).status).toBe(401)
  })

  it('rejects an empty list, too many students, and bad ids', async () => {
    expect((await bulk('super_admin', { ids: [] })).status).toBe(400)
    expect((await bulk('super_admin', { ids: ['not-a-uuid'] })).status).toBe(400)
    const tooMany = Array.from({ length: 101 }, () => crypto.randomUUID())
    expect((await bulk('super_admin', { ids: tooMany })).status).toBe(400)
    expect((await bulk('super_admin', {})).status).toBe(400)
  })

  it('answers 404 when none of the students exist', async () => {
    expect((await bulk('super_admin', { ids: [crypto.randomUUID()] })).status).toBe(404)
  })
})
