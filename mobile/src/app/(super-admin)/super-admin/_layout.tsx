import { Tabs } from 'expo-router';
import { GraduationCap, LayoutDashboard, Megaphone, UserCog } from 'lucide-react-native';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SuperAdminTabsLayout() {
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
      <Tabs.Screen name="teachers" options={{ title: 'Teachers', tabBarIcon: ({ color, size }) => <GraduationCap color={color} size={size} /> }} />
      <Tabs.Screen name="staff" options={{ title: 'Staff', tabBarIcon: ({ color, size }) => <UserCog color={color} size={size} /> }} />
      <Tabs.Screen name="notices" options={{ title: 'Notices', tabBarIcon: ({ color, size }) => <Megaphone color={color} size={size} /> }} />
    </Tabs>
  );
}
