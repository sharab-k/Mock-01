import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { resolveRequestClient } from '@/lib/supabase/session'
import { logAction } from '@/lib/audit/log'
import { MAX_RULE_FILES } from '@/lib/rules/constants'
import { checkImage, removeImage, storeImage } from '@/lib/rules/upload'

export const runtime = 'nodejs'

// Upload one or several rule pictures at once (multipart: `files` + a matching `titles`).
// Administration only. New pictures start unpublished, at the end of the order.
export async function POST(request: Request) {
  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'admissions_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const form = await request.formData().catch(() => null)
  const files = form?.getAll('files').filter((f): f is File => f instanceof File) ?? []
  const titles = form?.getAll('titles').map(String) ?? []
  if (files.length === 0) return NextResponse.json({ error: 'Choose at least one picture.' }, { status: 400 })
  if (files.length > MAX_RULE_FILES) return NextResponse.json({ error: `Upload at most ${MAX_RULE_FILES} pictures at a time.` }, { status: 400 })

  // Check every file before storing any, so one bad file does not leave half an upload behind.
  const checked = []
  for (const f of files) {
    const c = await checkImage(f)
    if ('error' in c) return NextResponse.json({ error: c.error }, { status: 400 })
    checked.push(c)
  }

  const { data: last } = await supabase.from('rule_documents').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle()
  let order = last?.sort_order ?? 0
  let created = 0
  for (const [i, image] of checked.entries()) {
    const title = (titles[i] ?? '').trim().slice(0, 120) || files[i]!.name.replace(/\.[^.]+$/, '').slice(0, 120) || 'Rules'
    const path = `${randomUUID()}.${image.ext}`
    if (!(await storeImage(path, image))) continue
    const { error } = await supabase.from('rule_documents').insert({ title, storage_path: path, sort_order: ++order, created_by: user.id })
    if (error) { await removeImage(path); continue }
    created++
  }
  if (created === 0) return NextResponse.json({ error: 'Could not save the pictures.' }, { status: 500 })

  await logAction(supabase, user.id, `Uploaded ${created} rules picture${created === 1 ? '' : 's'}`)
  return NextResponse.json({ ok: true, created, failed: checked.length - created })
}
