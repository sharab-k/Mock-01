import { resolveClassDate } from '@/lib/attendance/class-date'
import { FIRST_YEAR_GRADE, isFaculty, subjectsForFaculty, type Faculty, type SubjectGrade } from '@/lib/attendance/first-year-subjects'

// First and Second Year are both co-ed, lettered A–E (lib/students/constants.ts).
export const FIRST_YEAR_SECTIONS = ['A', 'B', 'C', 'D', 'E'] as const
export const SUBJECT_YEAR_SECTIONS = FIRST_YEAR_SECTIONS

export type FirstYearSelection = {
  /** 11 = First Year, 12 = Second Year. */
  grade: SubjectGrade
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
export function resolveFirstYearSelection(raw: RawSelection, grade: SubjectGrade = FIRST_YEAR_GRADE): FirstYearSelection {
  const section = FIRST_YEAR_SECTIONS.find((s) => s === raw.section) ?? 'A'
  const faculty = isFaculty(raw.faculty) ? raw.faculty : null
  const subject = subjectsForFaculty(faculty, grade).find((s) => s === raw.subject) ?? ''
  return { grade, section, classDate: resolveClassDate(raw.date), faculty, subject }
}

// "Thursday" for 2026-11-05 — the day shown next to the date picker.
export function dayName(classDate: string): string {
  return new Date(`${classDate}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
}

export function longDate(classDate: string): string {
  return new Date(`${classDate}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}
