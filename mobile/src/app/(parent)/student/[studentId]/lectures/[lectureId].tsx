import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2, Clock3, Pause, Play } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusPill } from '@/components/ui/status-pill';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useLinkedChildContext } from '@/lib/parent/linked-child-context';
import { useVideoHeartbeat } from '@/lib/video/use-heartbeat';

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// No real video asset is wired up yet (video_lectures.storage_path exists in
// the schema but nothing plays from it on the web app either) — this mirrors
// the web's StudentLecturesContent.tsx exactly: a simulated play/pause
// toggle driving a REAL heartbeat POST loop. The watch-time mechanism below
// is fully real and server-authoritative; only the video frame is a stand-in.
export default function LecturePlayerScreen() {
  const params = useLocalSearchParams<{
    studentId: string;
    lectureId: string;
    title: string;
    subject: string;
    durationSeconds: string;
    watchedSeconds: string;
    completed: string;
  }>();
  const child = useLinkedChildContext();

  const durationSeconds = Number(params.durationSeconds);
  const [watchedSeconds, setWatchedSeconds] = useState(Number(params.watchedSeconds));
  const [completed, setCompleted] = useState(params.completed === 'true');
  const [isPlaying, setIsPlaying] = useState(false);

  useVideoHeartbeat({
    studentId: params.studentId,
    lectureId: params.lectureId,
    isPlaying,
    onTick: (result) => {
      setWatchedSeconds(result.watchedSeconds);
      setCompleted(result.completed);
    },
    onCapped: () => setIsPlaying(false),
  });

  const pct = durationSeconds > 0 ? Math.round((watchedSeconds / durationSeconds) * 100) : 0;
  const isLateEnrollment = child.isLateEnrollment;
  const fullyWatched = watchedSeconds >= durationSeconds;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="" onBack={() => router.back()} />
        </View>

        <View style={styles.player}>
          <Pressable
            onPress={() => setIsPlaying((p) => !p)}
            disabled={fullyWatched}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            style={[styles.playButton, fullyWatched && { opacity: 0.5 }]}>
            {isPlaying ? <Pause size={26} color="#FFFFFF" /> : <Play size={26} color="#FFFFFF" style={{ marginLeft: 3 }} />}
          </Pressable>

          {/* Translucent versions of the warning/success tokens (no opaque
              token would blend with the video thumbnail underneath) —
              foreground colors still reference Semantic directly. */}
          {isLateEnrollment && (
            <View style={[styles.badge, styles.badgeLeft, { backgroundColor: 'rgba(247,240,227,0.92)' }]}>
              <Clock3 size={11} color={Semantic.warning} />
              <ThemedText variant="small" style={{ color: Semantic.warning }}>Late enrollment — strict tracking</ThemedText>
            </View>
          )}
          {completed && (
            <View style={[styles.badge, styles.badgeRight, { backgroundColor: 'rgba(234,245,240,0.92)' }]}>
              <CheckCircle2 size={11} color={Semantic.success} />
              <ThemedText variant="small" style={{ color: Semantic.success }}>Completed</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.details}>
          <StatusPill tone="ink" label={params.subject} />
          <ThemedText variant="subtitle" style={{ marginTop: Spacing.two }}>{params.title}</ThemedText>

          <View style={{ marginTop: Spacing.three, gap: 6 }}>
            <ProgressBar pct={pct} tone={completed ? 'success' : 'accent'} />
            <View style={styles.progressLabels}>
              <ThemedText variant="mono" color="textMuted">{fmt(watchedSeconds)} watched</ThemedText>
              <ThemedText variant="mono" color="textMuted">{pct}% · {fmt(durationSeconds)} total</ThemedText>
            </View>
          </View>

          <ThemedText variant="small" color="textMuted" style={{ marginTop: Spacing.three, lineHeight: 18 }}>
            Watch time only accumulates while the app is open and playing. Seeking ahead doesn&apos;t count the
            skipped span{isLateEnrollment ? ' — completion requires 90% of the actual runtime watched.' : '.'}
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  player: {
    marginHorizontal: Spacing.four,
    marginTop: Spacing.three,
    aspectRatio: 16 / 9,
    borderRadius: Radius.lg,
    backgroundColor: Ink[900],
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.pill,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeLeft: { left: 12 },
  badgeRight: { right: 12 },
  details: { padding: Spacing.four },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
});
