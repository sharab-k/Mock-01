// First Year (grade 11) attends by faculty and subject, not for a fixed full day.
// Ported from the web's lib/attendance/first-year-subjects.ts — keep the two in sync.
// A student's faculty is students.stream; the subjects they take follow from it.

export const FIRST_YEAR_GRADE = '11';
export const FIRST_YEAR_SECTIONS = ['A', 'B', 'C', 'D', 'E'] as const;

export const FACULTIES = ['Pre-Engineering', 'Pre-Medical', 'Computer Science'] as const;
export type Faculty = (typeof FACULTIES)[number];

export const SUBJECTS_BY_FACULTY: Record<Faculty, readonly string[]> = {
  'Pre-Engineering': ['Physics', 'Mathematics', 'Chemistry', 'English', 'Urdu', 'Islamiat'],
  'Pre-Medical': ['Physics', 'Biology', 'Chemistry', 'English', 'Urdu', 'Islamiat'],
  'Computer Science': ['Physics', 'Mathematics', 'Computer Science', 'English', 'Urdu', 'Islamiat'],
};

export const ALL_SUBJECTS: readonly string[] = [
  'Physics', 'Mathematics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Urdu', 'Islamiat',
];

export function isFaculty(value: string | null | undefined): value is Faculty {
  return FACULTIES.some((f) => f === value);
}

export function subjectsForFaculty(faculty: Faculty | null): readonly string[] {
  return faculty ? SUBJECTS_BY_FACULTY[faculty] : ALL_SUBJECTS;
}

export function facultiesForSubject(subject: string): Faculty[] {
  return FACULTIES.filter((f) => SUBJECTS_BY_FACULTY[f].includes(subject));
}

// A student whose faculty is not set can only be placed in a subject every faculty
// takes; a stream outside the three faculties (e.g. Commerce) takes none of these.
export function studentTakesSubject(stream: string | null, subject: string): boolean {
  if (isFaculty(stream)) return SUBJECTS_BY_FACULTY[stream].includes(subject);
  if (stream) return false;
  return facultiesForSubject(subject).length === FACULTIES.length;
}

export function studentInSubjectList(stream: string | null, subject: string, faculty: Faculty | null): boolean {
  if (faculty) return stream === faculty && SUBJECTS_BY_FACULTY[faculty].includes(subject);
  return studentTakesSubject(stream, subject);
}

export function isUnplaced(stream: string | null, subject: string): boolean {
  return !stream && !studentTakesSubject(stream, subject);
}
