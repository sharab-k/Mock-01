'use client'

export type ReportKind = 'month' | 'full'

const EVENT = 'je-report-choice-request'

type Detail = { resolve: (kind: ReportKind | null) => void }

// Asks the person which progress report they want. A <ReportChoiceHost />
// mounted once in the root layout shows the popup; this resolves with the
// choice, or null if it was closed. Lets every existing "Progress Report"
// button offer the two options without each one owning a popup.
export function askReportKind(): Promise<ReportKind | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { resolve } }))
  })
}

export const REPORT_CHOICE_EVENT = EVENT
export type { Detail as ReportChoiceDetail }
