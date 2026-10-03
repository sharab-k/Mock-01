import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';
import { FileDown } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Ink, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { downloadProgressReport } from '@/lib/reports/download';

// One progress-report trigger shared by staff lists. The report is authorized
// server-side (a parent only for linked children, staff for any student), so
// showing it is UX, not the gate.
export function ReportDownloadButton({
  studentId,
  studentName,
  variant = 'icon',
}: {
  studentId: string;
  studentName: string;
  variant?: 'icon' | 'full';
}) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const result = await downloadProgressReport(studentId, studentName);
    setLoading(false);
    if (!result.ok) Alert.alert('Could not download report', result.error);
  }

  if (variant === 'full') {
    return <Button label={loading ? 'Preparing report…' : 'Download progress report'} variant="secondary" loading={loading} onPress={run} fullWidth />;
  }

  return (
    <Pressable
      onPress={run}
      disabled={loading}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Download ${studentName}'s progress report`}
      style={[styles.icon, { backgroundColor: Ink[50] }]}>
      {loading ? <ActivityIndicator size="small" color={theme.accent} /> : <FileDown size={15} color={Ink[700]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  icon: { width: 34, height: 34, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
