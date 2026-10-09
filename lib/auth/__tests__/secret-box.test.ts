import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { decryptSecret, encryptSecret, SecretDecryptError, SecretKeyError } from '../secret-box'

const KEY = randomBytes(32).toString('base64')
const OTHER_KEY = randomBytes(32).toString('base64')

describe('secret-box (recoverable parent password vault)', () => {
  it('round-trips a password, including awkward characters', () => {
    for (const pw of ['Ss%u7S*pu4t*', 'pa ss"w\'ord\\!', 'عائشہ-123', 'x'.repeat(200)]) {
      expect(decryptSecret(encryptSecret(pw, KEY), KEY)).toBe(pw)
    }
  })

  it('never stores the password itself and uses a fresh nonce each time', () => {
    const a = encryptSecret('Ss%u7S*pu4t*', KEY)
    const b = encryptSecret('Ss%u7S*pu4t*', KEY)
    expect(a).not.toContain('Ss%u7S*pu4t*')
    expect(a).not.toBe(b) // same input, different ciphertext
    expect(a.startsWith('v1.')).toBe(true)
  })

  it('refuses to decrypt with the wrong key', () => {
    const token = encryptSecret('secret', KEY)
    expect(() => decryptSecret(token, OTHER_KEY)).toThrow(SecretDecryptError)
  })

  it('detects tampering with the ciphertext or the auth tag', () => {
    const [v, iv, tag, ct] = encryptSecret('secret', KEY).split('.')
    const flip = (s: string) => (s[0] === 'A' ? 'B' : 'A') + s.slice(1)
    expect(() => decryptSecret([v, iv, tag, flip(ct)].join('.'), KEY)).toThrow(SecretDecryptError)
    expect(() => decryptSecret([v, iv, flip(tag), ct].join('.'), KEY)).toThrow(SecretDecryptError)
  })

  it('rejects malformed or unversioned tokens', () => {
    expect(() => decryptSecret('not-a-token', KEY)).toThrow(SecretDecryptError)
    expect(() => decryptSecret('v2.a.b.c', KEY)).toThrow(SecretDecryptError)
  })

  it('fails loudly when the key is missing or the wrong size', () => {
    expect(() => encryptSecret('x', '')).toThrow(SecretKeyError)
    expect(() => encryptSecret('x', Buffer.from('short').toString('base64'))).toThrow(SecretKeyError)
  })
})
