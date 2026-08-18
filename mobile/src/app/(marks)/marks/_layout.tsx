import { Tabs } from 'expo-router';
import { BarChart2, LayoutDashboard, PenLine } from 'lucide-react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function MarksTabsLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentStrong,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        tabBarLabelStyle: { fontFamily: FontFamily.sansMedium, fontSize: 11 },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Dashboard', tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} /> }} />
      <Tabs.Screen name="enter" options={{ title: 'Enter', tabBarIcon: ({ color, size }) => <PenLine color={color} size={size} /> }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} /> }} />
    </Tabs>
  );
}
