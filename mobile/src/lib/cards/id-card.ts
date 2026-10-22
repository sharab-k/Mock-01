import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase/client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type CardResult = { ok: true } | { ok: false; error: string };

async function token(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// Whether the student already has a card picture. Only the status is used —
// the image itself is never shown on the phone.
export async function hasCardPhoto(studentId: string): Promise<boolean> {
  const t = await token();
  if (!API_BASE_URL || !t) return false;
  try {
    const res = await fetch(`${API_BASE_URL}/api/students/${studentId}/photo`, { headers: { Authorization: `Bearer ${t}` } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function downloadIdCard(studentId: string, studentName: string): Promise<CardResult> {
  const t = await token();
  if (!API_BASE_URL) return { ok: false, error: 'API base URL is not configured.' };
  if (!t) return { ok: false, error: 'Not signed in.' };
  try {
    const file = await File.downloadFileAsync(`${API_BASE_URL}/api/students/${studentId}/card`, Paths.cache, {
      headers: { Authorization: `Bearer ${t}` },
      idempotent: true,
    });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', dialogTitle: `${studentName} — ID card` });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not download the ID card. Please try again.' };
  }
}

// Lets the person choose a picture and uploads it. Returns ok with no error
// when they back out of the picker.
export async function pickAndUploadCardPhoto(studentId: string): Promise<CardResult & { uploaded?: boolean }> {
  const t = await token();
  if (!API_BASE_URL) return { ok: false, error: 'API base URL is not configured.' };
  if (!t) return { ok: false, error: 'Not signed in.' };

  const picked = await DocumentPicker.getDocumentAsync({ type: ['image/jpeg', 'image/png', 'image/webp'], copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets[0]) return { ok: true, uploaded: false };
  const asset = picked.assets[0];

  const form = new FormData();
  if (asset.file) form.append('file', asset.file);
  else form.append('file', { uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob);

  try {
    const res = await fetch(`${API_BASE_URL}/api/students/${studentId}/photo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}` },
      body: form,
    });
    const json = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) return { ok: false, error: json?.error ?? 'The upload failed. Please try again.' };
    return { ok: true, uploaded: true };
  } catch {
    return { ok: false, error: 'Network error. Please check your connection and try again.' };
  }
}
