export type Grade = '9' | '10' | '11' | '12'
export type Section = 'A' | 'B' | 'C' | 'D'

export const GRADES: Grade[] = ['9', '10', '11', '12']
export const SECTIONS: Section[] = ['A', 'B', 'C', 'D']

export const INITIALS = (name: string) =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
