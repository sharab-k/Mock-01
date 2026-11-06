// Client-safe fee constants and formatters (no server imports).

export const FEE_METHODS = ['cash', 'bank_transfer', 'cheque', 'online', 'other'] as const
export type FeeMethod = (typeof FEE_METHODS)[number]

export const METHOD_LABEL: Record<FeeMethod, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  cheque: 'Cheque',
  online: 'Online',
  other: 'Other',
}

export const FEE_STATUSES = ['paid', 'unpaid', 'partially_paid', 'overdue'] as const
export type FeeChargeStatus = (typeof FEE_STATUSES)[number]

export const STATUS_LABEL: Record<FeeChargeStatus, string> = {
  paid: 'Paid',
  unpaid: 'Unpaid',
  partially_paid: 'Partially paid',
  overdue: 'Overdue',
}

// Paid is the only success; unpaid and partial are neutral-to-warning; overdue is the alarm.
export const STATUS_PILL: Record<FeeChargeStatus, string> = {
  paid: 'bg-success-bg text-success',
  unpaid: 'bg-neutral-100 text-neutral-600',
  partially_paid: 'bg-warning-bg text-warning',
  overdue: 'bg-danger-bg text-danger',
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** The Payments list shows at most this many receipts; totals come from SQL, never from the list. */
export const PAYMENT_LIST_LIMIT = 500

export function isFeeStatus(v: string): v is FeeChargeStatus {
  return (FEE_STATUSES as readonly string[]).includes(v)
}

/** "Rs 6,000" — whole rupees when there are no paisa, two decimals otherwise. */
export function formatRs(value: number): string {
  const whole = Number.isInteger(value)
  return `Rs ${value.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`
}

/** Numbers come back from PostgREST as numbers or numeric strings; never NaN. */
export function toNumber(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : 0
}

export function monthLabel(year: number, month: number | null): string {
  return month ? `${MONTH_NAMES[month - 1]} ${year}` : String(year)
}
