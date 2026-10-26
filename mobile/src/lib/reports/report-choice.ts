export type ReportKind = 'month' | 'full';

/** What the person picked: which report, and the month it is for (YYYY-MM). */
export type ReportChoice = { kind: ReportKind; month: string };

type Resolver = (choice: ReportChoice | null) => void;
type Listener = (resolve: Resolver) => void;

let listener: Listener | null = null;

// The mounted <ReportChoiceHost /> registers itself here; downloads ask for a
// choice through it (mirror of the web's lib/reports/report-choice.ts).
export function registerReportChoiceHost(fn: Listener | null) {
  listener = fn;
}

export function askReportChoice(): Promise<ReportChoice | null> {
  return new Promise((resolve) => {
    if (!listener) {
      resolve({ kind: 'full', month: new Date().toISOString().slice(0, 7) });
      return;
    }
    listener(resolve);
  });
}
