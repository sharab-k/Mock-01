// First Year (grade 11) and Second Year (grade 12) attend by faculty and subject,
// not for a fixed full day.
// Ported from the web's lib/attendance/first-year-subjects.ts — keep the two in sync.
// A student's faculty is students.stream; the subjects they take follow from it.

export const FIRST_YEAR_GRADE = '11';
export const SECOND_YEAR_GRADE = '12';
export const FIRST_YEAR_SECTIONS = ['A', 'B', 'C', 'D', 'E'] as const;

/** The grades that are marked by faculty and subject. */
export const SUBJECT_GRADES = [FIRST_YEAR_GRADE, SECOND_YEAR_GRADE] as const;
export type SubjectGrade = (typeof SUBJECT_GRADES)[number];

export function isSubjectGrade(value: string | null | undefined): value is SubjectGrade {
  return SUBJECT_GRADES.some((g) => g === value);
}

export const YEAR_LABEL: Record<SubjectGrade, string> = { '11': 'First Year', '12': 'Second Year' };

export const FACULTIES = ['Pre-Engineering', 'Pre-Medical', 'Computer Science'] as const;
export type Faculty = (typeof FACULTIES)[number];

// The two years differ only in the compulsory paper: Islamiat in First Year,
// Pak. Studies in Second Year.
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
};

export const SUBJECTS_BY_FACULTY: Record<Faculty, readonly string[]> = SUBJECTS_BY_FACULTY_BY_GRADE['11'];

export const ALL_SUBJECTS_BY_GRADE: Record<SubjectGrade, readonly string[]> = {
  '11': ['Physics', 'Mathematics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Urdu', 'Islamiat'],
  '12': ['Physics', 'Mathematics', 'Chemistry', 'Biology', 'Computer Science', 'English', 'Urdu', 'Pak. Studies'],
};
export const ALL_SUBJECTS: readonly string[] = ALL_SUBJECTS_BY_GRADE['11'];

export function isFaculty(value: string | null | undefined): value is Faculty {
  return FACULTIES.some((f) => f === value);
}

export function subjectsForFaculty(faculty: Faculty | null, grade: SubjectGrade = FIRST_YEAR_GRADE): readonly string[] {
  return faculty ? SUBJECTS_BY_FACULTY_BY_GRADE[grade][faculty] : ALL_SUBJECTS_BY_GRADE[grade];
}

export function facultiesForSubject(subject: string, grade: SubjectGrade = FIRST_YEAR_GRADE): Faculty[] {
  return FACULTIES.filter((f) => SUBJECTS_BY_FACULTY_BY_GRADE[grade][f].includes(subject));
}

// A student whose faculty is not set can only be placed in a subject every faculty
// takes; a stream outside the three faculties (e.g. Commerce) takes none of these.
export function studentTakesSubject(stream: string | null, subject: string, grade: SubjectGrade = FIRST_YEAR_GRADE): boolean {
  if (isFaculty(stream)) return SUBJECTS_BY_FACULTY_BY_GRADE[grade][stream].includes(subject);
  if (stream) return false;
  return facultiesForSubject(subject, grade).length === FACULTIES.length;
}

export function studentInSubjectList(stream: string | null, subject: string, faculty: Faculty | null, grade: SubjectGrade = FIRST_YEAR_GRADE): boolean {
  if (faculty) return stream === faculty && SUBJECTS_BY_FACULTY_BY_GRADE[grade][faculty].includes(subject);
  return studentTakesSubject(stream, subject, grade);
}

export function isUnplaced(stream: string | null, subject: string, grade: SubjectGrade = FIRST_YEAR_GRADE): boolean {
  return !stream && !studentTakesSubject(stream, subject, grade);
}
