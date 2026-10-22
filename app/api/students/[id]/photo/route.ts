import { NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { authorizeCard, loadCardStudent } from '@/lib/cards/access'
import { PhotoError, processCardPhoto, MAX_PHOTO_UPLOAD_BYTES } from '@/lib/cards/photo'
import { deletePhoto, downloadPhoto, uploadPhoto } from '@/lib/cards/storage'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// The card photo, for showing in the portal. Private: never a public URL.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCard(request, params)
  if ('error' in auth) return auth.error
  const student = await loadCardStudent(auth.studentId)
  const photo = student?.photo_path ? await downloadPhoto(student.photo_path) : null
  if (!photo) return NextResponse.json({ error: 'No photo.' }, { status: 404 })
  return new NextResponse(new Uint8Array(photo), {
    headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, no-store' },
  })
}

// A parent may set the photo once; only a Super Admin can replace it afterwards.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authorizeCard(request, params)
  if ('error' in auth) return auth.error
  const { studentId, actor } = auth

  const student = await loadCardStudent(studentId)
  if (!student) return NextResponse.json({ error: 'Student not found.' }, { status: 404 })
  if (actor.role === 'parent' && student.photo_path) {
    return NextResponse.json({ error: 'A picture has already been uploaded. Only the academy office can change it.' }, { status: 409 })
  }

  let file: File | null = null
  try {
    const form = await request.formData()
    const f = form.get('file')
    file = f instanceof File ? f : null
  } catch {
    return NextResponse.json({ error: 'Send the picture as a form upload.' }, { status: 400 })
  }
  if (!file) return NextResponse.json({ error: 'No picture was attached.' }, { status: 400 })
  if (file.size > MAX_PHOTO_UPLOAD_BYTES) return NextResponse.json({ error: 'The picture is too large (maximum 5 MB).' }, { status: 413 })

  let jpeg: Buffer
  try {
    jpeg = await processCardPhoto(Buffer.from(await file.arrayBuffer()))
  } catch (e) {
    const message = e instanceof PhotoError ? e.message : 'That file could not be read as a picture.'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const path = `${studentId}/${randomUUID()}.jpg`
  await uploadPhoto(path, jpeg)

  const admin = createAdminClient()
  const patch = { photo_path: path, photo_updated_at: new Date().toISOString(), photo_updated_by: actor.userId }
  // Parents: only while still empty, so two parallel uploads cannot both win.
  let query = admin.from('students').update(patch).eq('id', studentId)
  if (actor.role === 'parent') query = query.is('photo_path', null)
  const { data: updated, error } = await query.select('id')
  if (error || !updated || updated.length === 0) {
    await deletePhoto(path)
    if (error) return NextResponse.json({ error: 'Could not save the picture.' }, { status: 500 })
    return NextResponse.json({ error: 'A picture has already been uploaded. Only the academy office can change it.' }, { status: 409 })
  }

  if (student.photo_path) await deletePhoto(student.photo_path)
  return NextResponse.json({ ok: true })
}
