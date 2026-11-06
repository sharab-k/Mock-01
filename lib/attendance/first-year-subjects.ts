// First Year (grade 11) attends by faculty and subject, not for a fixed full day.
// Source: "Required updates to the attendance marking system" §3 and §5.
// A student's faculty is students.stream; the subjects they take follow from it.

export const FIRST_YEAR_GRADE = '11'

export const FACULTIES = ['Pre-Engineering', 'Pre-Medical', 'Computer Science'] as const
export type Faculty = (typeof FACULTIES)[number]

export const SUBJECTS_BY_FACULTY: Record<Faculty, readonly string[]> = {
  'Pre-Engineering': ['Physics', 'Mathematics', 'Chemistry', 'English', 'Urdu', 'Islamiat'],
  'Pre-Medical': ['Physics', 'Biology', 'Chemistry', 'English', 'Urdu', 'Islamiat'],
  'Computer Science': ['Physics', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Islamiat'],
}

// Every subject any faculty takes, in a stable teaching order.
export const ALL_SUBJECTS: readonly string[] = [
  'Physics', 'Mathematics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Urdu', 'Islamiat',
]

export function isFaculty(value: string | null | undefined): value is Faculty {
  return FACULTIES.some((f) => f === value)
}

export function isFirstYearSubject(value: string | null | undefined): value is string {
  return ALL_SUBJECTS.some((s) => s === value)
}

// The subjects offered once a faculty is chosen; with no faculty chosen, all of them.
export function subjectsForFaculty(faculty: Faculty | null): readonly string[] {
  return faculty ? SUBJECTS_BY_FACULTY[faculty] : ALL_SUBJECTS
}

// Faculties whose students study this subject (Physics → all three, Biology → Pre-Medical only).
export function facultiesForSubject(subject: string): Faculty[] {
  return FACULTIES.filter((f) => SUBJECTS_BY_FACULTY[f].includes(subject))
}

// True when a student with this stream studies the subject. A student whose
// faculty is not set can only be placed in a subject every faculty takes, since
// that is the one case where the answer doesn't depend on the faculty.
// A stream outside the three faculties (e.g. Commerce) takes none of these subjects.
export function studentTakesSubject(stream: string | null, subject: string): boolean {
  if (isFaculty(stream)) return SUBJECTS_BY_FACULTY[stream].includes(subject)
  if (stream) return false
  return facultiesForSubject(subject).length === FACULTIES.length
}

// The attendance list for a class: the chosen subject, optionally narrowed to one faculty.
export function studentInSubjectList(stream: string | null, subject: string, faculty: Faculty | null): boolean {
  if (faculty) return stream === faculty && SUBJECTS_BY_FACULTY[faculty].includes(subject)
  return studentTakesSubject(stream, subject)
}

// A student with no faculty on record who can't be placed in this subject.
export function isUnplaced(stream: string | null, subject: string): boolean {
  return !stream && !studentTakesSubject(stream, subject)
}
