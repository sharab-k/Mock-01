import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarCheck, GraduationCap, Users } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { RoleChip, RoleDot } from '@/components/ui/role-badge';
import { StatCard } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';

// Internal-only verification screen (reachable at /dev/style-guide, never
// linked from real navigation) — exercises every shared primitive against
// the live token file so light/dark + font loading can be checked by eye.
export default function StyleGuideScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText variant="serifTitle">JE Academy</ThemedText>
          <ThemedText variant="small" color="textSecondary">Design system preview — internal only</ThemedText>

          <View style={styles.row}>
            <StatCard icon={Users} label="Students" value="1,204" delta={{ value: '+12 this term', direction: 'up' }} />
            <StatCard icon={CalendarCheck} label="Attendance" value="96.2%" delta={{ value: '-0.4%', direction: 'down' }} />
          </View>

          <Card style={{ gap: 10 }}>
            <ThemedText variant="subtitle">Status pills</ThemedText>
            <View style={styles.row}>
              <StatusPill tone="success" />
              <StatusPill tone="danger" />
              <StatusPill tone="warning" />
            </View>
          </Card>

          <Card style={{ gap: 10 }}>
            <ThemedText variant="subtitle">Role identity</ThemedText>
            <View style={styles.row}>
              <RoleDot role="attendance_admin" />
              <RoleChip role="marks_admin" label="Marks Admin" />
              <RoleChip role="parent" label="Parent" />
            </View>
          </Card>

          <Card style={{ gap: 8 }}>
            <ListRow title="Ahmed Ali" subtitle="Roll No. 10-A-014" leading={<Avatar name="Ahmed Ali" />} onPress={() => {}} />
            <ListRow title="Sara Khan" subtitle="Roll No. 10-A-015" leading={<GraduationCap size={20} />} onPress={() => {}} />
          </Card>

          <Card style={{ gap: 12 }}>
            <ThemedText variant="subtitle">Form field</ThemedText>
            <TextField label="Full name" placeholder="Ahmed Ali" />
            <ThemedText variant="mono" color="textSecondary">10-A-014 · 2026-08-09</ThemedText>
          </Card>

          <View style={{ gap: 10 }}>
            <Button label="Mark attendance" onPress={() => {}} />
            <Button label="Cancel" variant="secondary" onPress={() => {}} />
            <Button label="Remove" variant="danger" onPress={() => {}} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', gap: Spacing.three, flexWrap: 'wrap' },
});
