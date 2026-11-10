// The group a student is printed under on the ID card. Chosen before the card can be printed or downloaded;
// Super Admin can change it at any time. Pure data, no server imports.

export const COLLEGE_GROUPS = ['Pre-Engineering', 'Pre-Medical', 'General Science', 'Commerce'] as const
export const MATRIC_GROUPS = ['Biology', 'Engineering'] as const

export type CardGroup = (typeof COLLEGE_GROUPS)[number] | (typeof MATRIC_GROUPS)[number]

/** 9 and 10 (matric) choose Biology or Engineering; 11, 12 and I.Com choose from the four college groups. */
export function groupsForGrade(gradeLevel: string): readonly CardGroup[] {
  const g = gradeLevel.trim().toUpperCase()
  if (g === '9' || g === '10') return MATRIC_GROUPS
  return COLLEGE_GROUPS
}

export function isGroupForGrade(gradeLevel: string, group: string): group is CardGroup {
  return (groupsForGrade(gradeLevel) as readonly string[]).includes(group)
}
