// Client-safe constants for Rules and Regulations uploads.

export const RULES_BUCKET = 'rules-images'
export const MAX_RULE_FILES = 20
export const MAX_RULE_BYTES = 6 * 1024 * 1024
export const RULE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const RULE_IMAGE_ACCEPT = RULE_MIME_TYPES.join(',')

/** Recognises the real file type from its first bytes — a renamed .exe never passes as an image. */
export function sniffImageType(bytes: Uint8Array): (typeof RULE_MIME_TYPES)[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png'
  if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp'
  return null
}

export const EXT: Record<(typeof RULE_MIME_TYPES)[number], string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
