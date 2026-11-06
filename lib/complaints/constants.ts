// Client-safe complaint constants.

export const COMPLAINT_STATUSES = ['pending', 'in_progress', 'resolved'] as const
export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number]

export const COMPLAINT_LABEL: Record<ComplaintStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  resolved: 'Resolved',
}

// Only the three existing semantic colours: warning (waiting), ink (being worked on), success (done).
export const COMPLAINT_PILL: Record<ComplaintStatus, string> = {
  pending: 'bg-warning-bg text-warning',
  in_progress: 'bg-ink-100 text-ink-700',
  resolved: 'bg-success-bg text-success',
}

export function isComplaintStatus(v: string): v is ComplaintStatus {
  return (COMPLAINT_STATUSES as readonly string[]).includes(v)
}

export const COMPLAINT_LIST_LIMIT = 500
