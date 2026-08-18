import { supabase } from '@/lib/supabase/client';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string };

// Shared client for every app/api/mobile/** route from Phase 0 — attaches
// the bearer token, POSTs the body, and normalizes network/parse failures
// into the same {ok:false, error} shape the underlying Server Action
// already returns, so call sites read identically to their web equivalents.
export async function callMobileApi<T extends Record<string, unknown> = Record<string, never>>(
  path: string,
  body: unknown,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST',
): Promise<ApiResult<T>> {
  if (!API_BASE_URL) return { ok: false, error: 'API base URL is not configured.' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not signed in.' };

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: json?.error ?? 'Something went wrong. Please try again.' };
    return { ok: true, ...(json as T) };
  } catch {
    return { ok: false, error: 'Network error. Please check your connection and try again.' };
  }
}

// GET counterpart for the handful of admin-client-mediated reads (e.g.
// class roster) that can't run as a direct RLS-scoped client query.
export async function getMobileApi<T>(path: string): Promise<ApiResult<T & Record<string, unknown>>> {
  if (!API_BASE_URL) return { ok: false, error: 'API base URL is not configured.' };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: 'Not signed in.' };

  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: json?.error ?? 'Something went wrong. Please try again.' };
    return { ok: true, ...(json as T & Record<string, unknown>) };
  } catch {
    return { ok: false, error: 'Network error. Please check your connection and try again.' };
  }
}
