import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs, useLocalSearchParams } from 'expo-router';
import { BookOpen, CalendarCheck, LayoutDashboard, Megaphone, PlayCircle } from 'lucide-react-native';

import { ErrorState } from '@/components/error-state';
import { FontFamily, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLinkedChild } from '@/lib/parent/use-linked-child';
import { LinkedChildProvider } from '@/lib/parent/linked-child-context';

// Reached only through a signed-in parent's own session, for one child
// confirmed linked to them (useLinkedChild) — there is no independent
// student login (CLAUDE.md §4). A denied/unknown studentId bounces back to
// the parent dashboard instead of showing a dead end, mirroring
// requireParentAccessToChild's redirect on the web.
//
// This is the ONLY place under this route that calls useLinkedChild — every
// screen below reads the already-resolved child from LinkedChildProvider
// instead of independently re-querying. Two separate calls to the same
// RLS-gated query could genuinely disagree with each other (confirmed: a
// screen's own second query returned 'denied' immediately after this
// layout's identical query had already succeeded and rendered the tab bar),
// and no per-screen call site had anywhere to send a 'denied' result except
// its own permanent loading spinner — that combination is what actually
// caused the "Lectures never loads" reports.
export default function StudentTabsLayout() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  const theme = useTheme();
  const state = useLinkedChild(studentId);

  if (state.status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (state.status === 'denied') return <Redirect href="/parent" />;

  if (state.status === 'error') {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, padding: Spacing.four }}>
        <ErrorState message={state.error} onRetry={state.reload} />
      </View>
    );
  }

  return (
    <LinkedChildProvider child={state.child}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.accentStrong,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
          tabBarLabelStyle: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
        }}>
        <Tabs.Screen name="index" options={{ title: 'Overview', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
        <Tabs.Screen name="lectures" options={{ title: 'Lectures', tabBarIcon: ({ color, size }) => <PlayCircle color={color} size={size} /> }} />
        <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} /> }} />
        <Tabs.Screen name="marks" options={{ title: 'Marks', tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} /> }} />
        <Tabs.Screen name="notices" options={{ title: 'Notices', tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} /> }} />
      </Tabs>
    </LinkedChildProvider>
  );
}
