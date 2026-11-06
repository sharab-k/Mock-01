import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { resolveRequestClient } from '@/lib/supabase/session'
import { logAction } from '@/lib/audit/log'
import { checkImage, removeImage, storeImage } from '@/lib/rules/upload'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Replace the picture of an existing rule, keeping its title, order and published state.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!UUID.test(id)) return NextResponse.json({ error: 'Invalid picture.' }, { status: 400 })

  const supabase = await resolveRequestClient(request)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin' && profile?.role !== 'admissions_admin') return NextResponse.json({ error: 'Not authorized.' }, { status: 403 })

  const file = (await request.formData().catch(() => null))?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a picture.' }, { status: 400 })
  const image = await checkImage(file)
  if ('error' in image) return NextResponse.json({ error: image.error }, { status: 400 })

  const { data: row } = await supabase.from('rule_documents').select('title, storage_path').eq('id', id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Picture not found.' }, { status: 404 })

  const path = `${randomUUID()}.${image.ext}`
  if (!(await storeImage(path, image))) return NextResponse.json({ error: 'Could not store the picture.' }, { status: 500 })
  const { error } = await supabase.from('rule_documents').update({ storage_path: path }).eq('id', id)
  if (error) { await removeImage(path); return NextResponse.json({ error: 'Could not save the picture.' }, { status: 500 }) }

  await removeImage(row.storage_path)
  await logAction(supabase, user.id, `Replaced rules picture — ${row.title}`)
  return NextResponse.json({ ok: true })
}
