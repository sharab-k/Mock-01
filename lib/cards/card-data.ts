// Pure helpers and types for the student ID card — no database, no server-only
// imports, so they are unit tested directly.

export type StudentCardData = {
  fullName: string
  /** G.R. number as printed on the card; falls back to the roll number. */
  grNumber: string
  gradeLabel: string
  section: string
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

export const CARD_NOTE = 'NOTE: FINDER OF THIS CARD MAY POST OR RETURN IT TO THE ACADEMY.'
