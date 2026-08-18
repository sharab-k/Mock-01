import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase/client';

// Same cadence as the web's StudentLecturesContent.tsx (HEARTBEAT_INTERVAL_MS
// = 5000, not the "~10s" CLAUDE.md §7 rounds it to in prose) — kept
// identical so watch-time credit accrues at the same rate on both clients.
const HEARTBEAT_INTERVAL_MS = 5000;
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type HeartbeatResult = { watchedSeconds: number; durationSeconds: number; completed: boolean };

// The server is the sole source of truth for watched_seconds (CLAUDE.md §7:
// "never trust a client-submitted total") — every tick here is a genuine
// POST to /api/video/heartbeat (bearer-authed, Phase 0), gated on the app
// actually being foregrounded (AppState is React Native's equivalent of the
// web's document.visibilitychange).
export function useVideoHeartbeat({
  studentId,
  lectureId,
  isPlaying,
  onTick,
  onCapped,
}: {
  studentId: string;
  lectureId: string;
  isPlaying: boolean;
  onTick: (result: HeartbeatResult) => void;
  onCapped: () => void;
}) {
  const appActive = useRef(AppState.currentState === 'active');
  const onTickRef = useRef(onTick);
  const onCappedRef = useRef(onCapped);

  // Refs are kept current in an effect (runs after every render) rather
  // than mutated inline during render, which React can invoke more than
  // once per commit.
  useEffect(() => {
    onTickRef.current = onTick;
    onCappedRef.current = onCapped;
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { appActive.current = state === 'active'; });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!isPlaying || !API_BASE_URL) return;

    const interval = setInterval(async () => {
      if (!appActive.current) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${API_BASE_URL}/api/video/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ studentId, lectureId }),
      });
      if (!res.ok) return;

      const body = (await res.json()) as HeartbeatResult;
      onTickRef.current(body);
      if (body.watchedSeconds >= body.durationSeconds) onCappedRef.current();
    }, HEARTBEAT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isPlaying, studentId, lectureId]);
}
