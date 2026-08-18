import { Tabs } from 'expo-router';
import { Inbox, LayoutDashboard, Users } from 'lucide-react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AdmissionsTabsLayout() {
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
      <Tabs.Screen name="enquiries" options={{ title: 'Enquiries', tabBarIcon: ({ color, size }) => <Inbox color={color} size={size} /> }} />
      <Tabs.Screen name="students" options={{ title: 'Students', tabBarIcon: ({ color, size }) => <Users color={color} size={size} /> }} />
    </Tabs>
  );
}
