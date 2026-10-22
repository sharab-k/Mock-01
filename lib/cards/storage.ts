import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'student-photos'

// The bucket is private with no storage policies: these helpers (service role)
// are the only way in, and callers have already authorised the request.
export async function uploadPhoto(path: string, jpeg: Buffer): Promise<void> {
  const { error } = await createAdminClient().storage.from(BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: false })
  if (error) throw new Error(error.message)
}

export async function downloadPhoto(path: string): Promise<Buffer | null> {
  const { data, error } = await createAdminClient().storage.from(BUCKET).download(path)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function deletePhoto(path: string): Promise<void> {
  await createAdminClient().storage.from(BUCKET).remove([path])
}
