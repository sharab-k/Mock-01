// Shapes shared by the marks upload API and its popups (web + mobile). No
// server-only imports so client components can use them freely.

export type ExamType = 'monthly' | 'half_yearly' | 'final'

export const EXAM_LABEL: Record<ExamType, string> = { monthly: 'Monthly', half_yearly: 'Half-Yearly', final: 'Final' }

export type UploadRowError = { row: number; message: string }

export type MarksUploadResult = {
  /** 'preview' = nothing was written; 'saved' = marks were written. */
  mode: 'preview' | 'saved'
  format: 'rows' | 'wide'
  examType: ExamType
  totalRows: number
  /** Marks that were (or, in a preview, would be) written. */
  toSave: number
  students: number
  saved: number
  inserted: number
  updated: number
  skipped: number
  /** Cells that were empty or marked NILL / LEFT / "not come" — no mark, not a problem. */
  noMark: number
  errors: UploadRowError[]
  /** Matches worth a second look (matched by name, G.R. differs, name differs). */
  warnings: UploadRowError[]
  /** One line per test found in the file: sheet · date · subjects · totals. */
  tests: string[]
}
