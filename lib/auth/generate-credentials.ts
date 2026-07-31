import 'server-only'
import { randomInt } from 'crypto'

// Synthetic institutional username, matching the pattern the frontend already
// showed on the enrollment success screen before this was wired to real data
// (AdmissionsNewStudentContent's old genCredential()). Not a real mailbox —
// purely a login identifier, same as CLAUDE.md §4's "auto-issues parent
// credentials" flow implies. `suffix` disambiguates on a collision.
export function generateUsername(fullName: string, suffix?: number): string {
  const slug = fullName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '.')
  return `${slug}${suffix ? suffix : ''}.parent@jeacademy.edu.pk`
}

const PASSWORD_CHARS = {
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', // no I/O — avoids visual ambiguity
  lower: 'abcdefghijkmnpqrstuvwxyz',
  digit: '23456789',
  symbol: '!@#$%*',
}

// Crypto-safe temp password — displayed once on the enrollment success
// screen, never logged, never stored in plaintext anywhere after this.
export function generateTempPassword(length = 12): string {
  const pools = Object.values(PASSWORD_CHARS)
  const required = pools.map((pool) => pool[randomInt(pool.length)])
  const all = pools.join('')
  const rest = Array.from({ length: length - required.length }, () => all[randomInt(all.length)])

  const chars = [...required, ...rest]
  // Fisher-Yates shuffle so the required-category chars aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}
