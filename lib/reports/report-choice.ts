'use client'

export type ReportKind = 'month' | 'full'

/** What the person picked: which report, and the month it is for (YYYY-MM). */
export type ReportChoice = { kind: ReportKind; month: string }

const EVENT = 'je-report-choice-request'

type Detail = { resolve: (choice: ReportChoice | null) => void }

// Asks the person which progress report they want and for which month. A
// <ReportChoiceHost /> mounted once in the root layout shows the popup; this
// resolves with the choice, or null if it was closed. Lets every existing
// "Progress Report" button offer the options without each one owning a popup.
export function askReportChoice(): Promise<ReportChoice | null> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { resolve } }))
  })
}

export const REPORT_CHOICE_EVENT = EVENT
export type { Detail as ReportChoiceDetail }
