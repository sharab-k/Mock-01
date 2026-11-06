// First Year (grade 11) and Second Year (grade 12) attend by faculty and subject,
// not for a fixed full day.
// Source: "Required updates to the attendance marking system" §3, §4 and §5.
// A student's faculty is students.stream; the subjects they take follow from it.

export const FIRST_YEAR_GRADE = '11'
export const SECOND_YEAR_GRADE = '12'

/** The grades that are marked by faculty and subject. */
export const SUBJECT_GRADES = [FIRST_YEAR_GRADE, SECOND_YEAR_GRADE] as const
export type SubjectGrade = (typeof SUBJECT_GRADES)[number]

export function isSubjectGrade(value: string | null | undefined): value is SubjectGrade {
  return SUBJECT_GRADES.some((g) => g === value)
}

export const YEAR_LABEL: Record<SubjectGrade, string> = { '11': 'First Year', '12': 'Second Year' }
/** URL segment of the year's attendance screen (…/attendance/first-year). */
export const YEAR_SLUG: Record<SubjectGrade, string> = { '11': 'first-year', '12': 'second-year' }

export function gradeForYearSlug(slug: string | null | undefined): SubjectGrade | null {
  return SUBJECT_GRADES.find((g) => YEAR_SLUG[g] === slug) ?? null
}

export const FACULTIES = ['Pre-Engineering', 'Pre-Medical', 'Computer Science'] as const
export type Faculty = (typeof FACULTIES)[number]

// The two years differ only in the compulsory religion/civics paper: Islamiat in
// First Year, Pak. Studies in Second Year.
export const SUBJECTS_BY_FACULTY_BY_GRADE: Record<SubjectGrade, Record<Faculty, readonly string[]>> = {
  '11': {
    'Pre-Engineering': ['Physics', 'Mathematics', 'Chemistry', 'English', 'Urdu', 'Islamiat'],
    'Pre-Medical': ['Physics', 'Biology', 'Chemistry', 'English', 'Urdu', 'Islamiat'],
    'Computer Science': ['Physics', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Islamiat'],
  },
  '12': {
    'Pre-Engineering': ['Physics', 'Mathematics', 'Chemistry', 'English', 'Urdu', 'Pak. Studies'],
    'Pre-Medical': ['Physics', 'Biology', 'Chemistry', 'English', 'Urdu', 'Pak. Studies'],
    'Computer Science': ['Physics', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Pak. Studies'],
  },
}

// First Year's menus, kept under their original names.
export const SUBJECTS_BY_FACULTY: Record<Faculty, readonly string[]> = SUBJECTS_BY_FACULTY_BY_GRADE['11']

// Every subject any faculty takes in a year, in a stable teaching order.
export const ALL_SUBJECTS_BY_GRADE: Record<SubjectGrade, readonly string[]> = {
  '11': ['Physics', 'Mathematics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Urdu', 'Islamiat'],
  '12': ['Physics', 'Mathematics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Urdu', 'Pak. Studies'],
}
export const ALL_SUBJECTS: readonly string[] = ALL_SUBJECTS_BY_GRADE['11']

export function isFaculty(value: string | null | undefined): value is Faculty {
  return FACULTIES.some((f) => f === value)
}

export function isFirstYearSubject(value: string | null | undefined): value is string {
  return ALL_SUBJECTS.some((s) => s === value)
}

/** A subject that can be marked in either year. */
export function isAttendanceSubject(value: string | null | undefined): value is string {
  return SUBJECT_GRADES.some((g) => ALL_SUBJECTS_BY_GRADE[g].some((s) => s === value))
}

// The subjects offered once a faculty is chosen; with no faculty chosen, all of them.
export function subjectsForFaculty(faculty: Faculty | null, grade: SubjectGrade = FIRST_YEAR_GRADE): readonly string[] {
  return faculty ? SUBJECTS_BY_FACULTY_BY_GRADE[grade][faculty] : ALL_SUBJECTS_BY_GRADE[grade]
}

// Faculties whose students study this subject (Physics → all three, Biology → Pre-Medical only).
export function facultiesForSubject(subject: string, grade: SubjectGrade = FIRST_YEAR_GRADE): Faculty[] {
  return FACULTIES.filter((f) => SUBJECTS_BY_FACULTY_BY_GRADE[grade][f].includes(subject))
}

// True when a student with this stream studies the subject in that year. A student
// whose faculty is not set can only be placed in a subject every faculty takes,
// since that is the one case where the answer doesn't depend on the faculty.
// A stream outside the three faculties (e.g. Commerce) takes none of these subjects.
export function studentTakesSubject(stream: string | null, subject: string, grade: SubjectGrade = FIRST_YEAR_GRADE): boolean {
  if (isFaculty(stream)) return SUBJECTS_BY_FACULTY_BY_GRADE[grade][stream].includes(subject)
  if (stream) return false
  return facultiesForSubject(subject, grade).length === FACULTIES.length
}

// The attendance list for a class: the chosen subject, optionally narrowed to one faculty.
export function studentInSubjectList(stream: string | null, subject: string, faculty: Faculty | null, grade: SubjectGrade = FIRST_YEAR_GRADE): boolean {
  if (faculty) return stream === faculty && SUBJECTS_BY_FACULTY_BY_GRADE[grade][faculty].includes(subject)
  return studentTakesSubject(stream, subject, grade)
}

// A student with no faculty on record who can't be placed in this subject.
export function isUnplaced(stream: string | null, subject: string, grade: SubjectGrade = FIRST_YEAR_GRADE): boolean {
  return !stream && !studentTakesSubject(stream, subject, grade)
}
