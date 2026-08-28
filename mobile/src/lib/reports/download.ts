import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase/client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type DownloadReportResult = { ok: true } | { ok: false; error: string };

// Mobile equivalent of the web's lib/reports/download-client.ts. The report
// is still generated server-side (app/api/reports/[studentId]/route.ts,
// Phase 0's bearer-auth fallback) — this only downloads the bytes to a
// local file and opens the OS share sheet, since there's no DOM
// `<a download>` on native.
//
// The server route falls back to plain HTML when Puppeteer/Chromium can't
// launch (currently the case on this Vercel deployment) rather than hard
// failing, so the actual bytes returned can be a .pdf or an .html file
// depending on which path served the request. Passing a Directory (not a
// specific File) as the download destination lets expo-file-system pick the
// filename — and therefore the extension — from the response's
// Content-Disposition header instead of us hardcoding ".pdf" and mismatching
// whatever the server actually sent.
export async function downloadProgressReport(studentId: string, studentName: string): Promise<DownloadReportResult> {
  if (!API_BASE_URL) return { ok: false, error: 'API base URL is not configured.' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not signed in.' };

  try {
    const file = await File.downloadFileAsync(`${API_BASE_URL}/api/reports/${studentId}`, Paths.cache, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      idempotent: true,
    });

    const isHtml = file.uri.toLowerCase().endsWith('.html');

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: isHtml ? 'text/html' : 'application/pdf',
        dialogTitle: `${studentName} — Progress Report`,
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not download the report. Please try again.' };
  }
}
