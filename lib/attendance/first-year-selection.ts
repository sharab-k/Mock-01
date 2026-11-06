import { resolveClassDate } from '@/lib/attendance/class-date'
import { isFaculty, subjectsForFaculty, type Faculty } from '@/lib/attendance/first-year-subjects'

export const FIRST_YEAR_SECTIONS = ['A', 'B', 'C', 'D', 'E'] as const

export type FirstYearSelection = {
  section: string
  classDate: string
  faculty: Faculty | null
  /** '' until a subject is chosen. */
  subject: string
}

export type RawSelection = { section?: string; date?: string; faculty?: string; subject?: string }

// Turns the page's URL parameters into a selection that is always valid: an unknown
// section falls back to A, a future or malformed date to today, and a subject that
// the chosen faculty doesn't study is dropped (so the list can never show one).
export function resolveFirstYearSelection(raw: RawSelection): FirstYearSelection {
  const section = FIRST_YEAR_SECTIONS.find((s) => s === raw.section) ?? 'A'
  const faculty = isFaculty(raw.faculty) ? raw.faculty : null
  const subject = subjectsForFaculty(faculty).find((s) => s === raw.subject) ?? ''
  return { section, classDate: resolveClassDate(raw.date), faculty, subject }
}

// "Thursday" for 2026-11-05 — the day shown next to the date picker.
export function dayName(classDate: string): string {
  return new Date(`${classDate}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
}

export function longDate(classDate: string): string {
  return new Date(`${classDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
