export type Grade = '9' | '10' | '11' | '12';
export type Section = 'A' | 'B' | 'C' | 'D' | 'G';

export const GRADES: Grade[] = ['9', '10', '11', '12'];

const INTERMEDIATE_GRADES: Grade[] = ['11', '12'];

// Grades 9-10 split by gender (B = Boys, G = Girls); 11-12 (Intermediate) is
// co-ed and keeps the traditional A-D sections.
export function sectionsForGrade(grade: Grade): Section[] {
  return INTERMEDIATE_GRADES.includes(grade) ? ['A', 'B', 'C', 'D'] : ['B', 'G'];
}

export const GRADE_SECTION_PAIRS: { grade: Grade; section: Section }[] =
  GRADES.flatMap((g) => sectionsForGrade(g).map((section) => ({ grade: g, section })));

export const INITIALS = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
