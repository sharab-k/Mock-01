import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { EXT, MAX_RULE_BYTES, RULES_BUCKET, sniffImageType } from './constants'

export type CheckedImage = { bytes: Uint8Array; mime: 'image/jpeg' | 'image/png' | 'image/webp'; ext: string }

/** Size and real-content check (the file's own bytes, not its name or claimed type). */
export async function checkImage(file: File): Promise<CheckedImage | { error: string }> {
  if (file.size === 0) return { error: `${file.name} is empty.` }
  if (file.size > MAX_RULE_BYTES) return { error: `${file.name} is larger than ${MAX_RULE_BYTES / 1024 / 1024} MB.` }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const mime = sniffImageType(bytes)
  if (!mime) return { error: `${file.name} is not a JPG, PNG or WebP picture.` }
  return { bytes, mime, ext: EXT[mime] }
}

export async function storeImage(path: string, image: CheckedImage): Promise<boolean> {
  const { error } = await createAdminClient().storage.from(RULES_BUCKET).upload(path, image.bytes, { contentType: image.mime, upsert: false })
  return !error
}

export async function removeImage(path: string): Promise<void> {
  await createAdminClient().storage.from(RULES_BUCKET).remove([path])
}
