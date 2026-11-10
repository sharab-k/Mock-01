// Pure helpers and types for the student ID card — no database, no server-only
// imports, so they are unit tested directly.

export type StudentCardData = {
  fullName: string
  /** The student's father (printed as "Father"); '' when none is on file. */
  parentName: string
  /** Registration number issued at admission. */
  registrationNumber: string
  /** G.R. number as printed on the card; falls back to the roll number. */
  grNumber: string
  gradeLabel: string
  section: string
  /** Pre-Engineering, Pre-Medical, General Science, Commerce (11, 12) or Biology, Engineering (9, 10). */
  group: string
  /** e.g. "26/27" */
  session: string
  /** Processed card photo (JPEG, 5:6), or null for the placeholder. */
  photoJpeg: Uint8Array | null
}

const ROMAN: Record<string, string> = {
  '1': 'I', '2': 'II', '3': 'III', '4': 'IV', '5': 'V', '6': 'VI', '7': 'VII', '8': 'VIII',
  '9': 'IX', '10': 'X', '11': 'XI', '12': 'XII',
  'ICOM-1': 'I.COM-I', 'ICOM-2': 'I.COM-II',
}

// "9" -> "IX", "12" -> "XII", "ICOM-1" -> "I.COM-I". Anything unexpected is shown as stored.
export function gradeLabel(gradeLevel: string): string {
  return ROMAN[gradeLevel.trim().toUpperCase()] ?? gradeLevel.trim()
}

// The academic session as the card prints it: the year the student enrolled for
// and the next one, two digits each — 2026 -> "26/27", 2099 -> "99/00".
export function sessionLabel(academicYear: number): string {
  const yy = (n: number) => String(n % 100).padStart(2, '0')
  return `${yy(academicYear)}/${yy(academicYear + 1)}`
}

// A value that is empty prints as a dash, so every card keeps the same rows.
export function orDash(value: string | null | undefined): string {
  const v = (value ?? '').trim()
  return v || '—'
}

// Shortens text with an ellipsis until it fits `maxWidth` (the PDF font's measure).
export function truncateToWidth(text: string, maxWidth: number, measure: (s: string) => number): string {
  if (measure(text) <= maxWidth) return text
  let out = text
  while (out.length > 1 && measure(`${out}…`) > maxWidth) out = out.slice(0, -1)
  return `${out.trimEnd()}…`
}

// Greedy word wrap against a measuring function (the PDF font), used for the
// terms list and for a name too long for one line.
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (line && measure(next) > maxWidth) {
      lines.push(line)
      line = w
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}

export const CARD_TERMS = [
  'This ID card is the property of J.E Academy.',
  'This card is non-transferable and must be used by the student only.',
  'Students must carry their ID card to campus every day.',
  'This card must be presented on demand by any authorized staff member.',
  'Loss or damage must be reported immediately to the academy office.',
  'A replacement card will be issued on payment of the prescribed fee.',
  'This ID card must be returned to the academy upon leaving.',
] as const

/** The academy's phone number, printed under the note on the back of the card. */
export const ACADEMY_PHONE = '+92 343 3773203'

export const CARD_NOTE = 'NOTE: FINDER OF THIS CARD MAY POST OR RETURN IT TO THE ACADEMY.'
