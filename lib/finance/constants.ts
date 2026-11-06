// Client-safe finance constants.

/** The Expenses list shows at most this many rows; totals come from SQL, never from the list. */
export const EXPENSE_LIST_LIMIT = 500

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function firstOfMonth(iso: string): string {
  return `${iso.slice(0, 7)}-01`
}

export function monthRange(year: number, month: number): { from: string; to: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const last = new Date(year, month, 0).getDate()
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(last)}` }
}
