import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

// AES-256-GCM authenticated encryption for the recoverable parent-password
// vault. Pure (no I/O, no framework imports) so it can be unit tested and
// reused by one-off scripts. Token format: "v1.<iv>.<tag>.<ciphertext>" with
// each part base64url — the version prefix lets the scheme change later without
// breaking stored rows.
const VERSION = 'v1'

export class SecretKeyError extends Error {}
export class SecretDecryptError extends Error {}

function loadKey(keyB64: string | undefined): Buffer {
  if (!keyB64) throw new SecretKeyError('CREDENTIAL_ENCRYPTION_KEY is not set.')
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) throw new SecretKeyError('CREDENTIAL_ENCRYPTION_KEY must be 32 bytes, base64-encoded.')
  return key
}

export function encryptSecret(plain: string, keyB64: string | undefined = process.env.CREDENTIAL_ENCRYPTION_KEY): string {
  const key = loadKey(keyB64)
  const iv = randomBytes(12) // 96-bit nonce, fresh per encryption — never reused
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.')
}

export function decryptSecret(token: string, keyB64: string | undefined = process.env.CREDENTIAL_ENCRYPTION_KEY): string {
  const key = loadKey(keyB64)
  const [version, iv, tag, ciphertext] = token.split('.')
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new SecretDecryptError('Unrecognised credential format.')
  try {
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    // Wrong key or tampered data — GCM's auth tag catches both.
    throw new SecretDecryptError('Could not decrypt the stored credential (wrong key or corrupted data).')
  }
}
