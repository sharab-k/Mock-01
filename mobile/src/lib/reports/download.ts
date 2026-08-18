import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/lib/supabase/client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type DownloadReportResult = { ok: true } | { ok: false; error: string };

// Mobile equivalent of the web's lib/reports/download-client.ts. The PDF
// itself is still generated server-side by the existing Puppeteer pipeline
// (app/api/reports/[studentId]/route.ts, Phase 0's bearer-auth fallback) —
// this only downloads the bytes to a local file and opens the OS share
// sheet, since there's no DOM `<a download>` on native.
export async function downloadProgressReport(studentId: string, studentName: string): Promise<DownloadReportResult> {
  if (!API_BASE_URL) return { ok: false, error: 'API base URL is not configured.' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not signed in.' };

  const destination = new File(Paths.cache, `progress-report-${studentId}.pdf`);

  try {
    const file = await File.downloadFileAsync(`${API_BASE_URL}/api/reports/${studentId}`, destination, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      idempotent: true,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `${studentName} — Progress Report`,
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not download the report. Please try again.' };
  }
}
