// Upload rules and messages shared by the server (lib/uploads/sheet.ts) and the upload screens, so a file is
// judged the same way before it is sent as after, and a failure always says what to do about it.
// No server-only imports: client components use this directly.

/** The hosting platform rejects a request body above about 4.5 MB before our code runs, so the limit sits below it. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const MAX_MB = MAX_UPLOAD_BYTES / 1024 / 1024

export const OLD_EXCEL_MESSAGE =
  'This is an old Excel file (.xls). Open it in Excel, choose File → Save As → “Excel Workbook (.xlsx)”, then upload that file. Saving it as CSV also works.'

export const WRONG_TYPE_MESSAGE = 'Upload an Excel (.xlsx) or CSV (.csv) file.'

export const UNREADABLE_MESSAGE =
  'Could not read the file. If it came from another program, open it in Excel and save it again as “Excel Workbook (.xlsx)” or as CSV, then upload that.'

export function tooLargeMessage(bytes: number): string {
  return `This file is ${(bytes / 1024 / 1024).toFixed(1)} MB and the limit is ${MAX_MB} MB. Remove extra sheets or pictures, or save it as CSV, then try again.`
}

/** What is wrong with the chosen file, judged by name and size alone, or null when it can be sent. */
export function checkFileNameAndSize(name: string, size: number): string | null {
  const lower = name.toLowerCase()
  if (lower.endsWith('.xls')) return OLD_EXCEL_MESSAGE
  if (!lower.endsWith('.xlsx') && !lower.endsWith('.csv')) return WRONG_TYPE_MESSAGE
  if (size > MAX_UPLOAD_BYTES) return tooLargeMessage(size)
  if (size === 0) return 'The file is empty.'
  return null
}

/** A message for a failed upload request: the server's own words when it gave any, otherwise what the status means. */
export function uploadFailureMessage(status: number, body: { error?: string } | null): string {
  if (body?.error) return body.error
  if (status === 413) return `The file is too large for the server (limit ${MAX_MB} MB). Remove extra sheets or pictures, or save it as CSV.`
  if (status === 401) return 'You have been signed out. Sign in again, then retry.'
  if (status === 403) return 'This account is not allowed to upload this file.'
  if (status === 408 || status === 504) return 'The server took too long to process the file. Try a smaller file, or upload it in parts.'
  if (status >= 500) return `The server could not process this file (error ${status}). Try again; if it keeps failing, save the file as CSV and upload that.`
  return `The upload failed (error ${status}). Please try again.`
}
