import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { downloadIdCard, fetchCardGroup, hasCardPhoto, pickAndUploadCardPhoto, saveCardGroup, type GroupInfo } from '@/lib/cards/id-card';

function Chip({ label, active, disabled, onPress }: { label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={[styles.chip, { borderColor: active ? Ink[600] : theme.border, backgroundColor: active ? Ink[50] : theme.surface, opacity: disabled ? 0.6 : 1 }]}>
      <ThemedText variant="small" style={active ? { color: Ink[700] } : undefined}>{label}</ThemedText>
    </Pressable>
  );
}

// ID card section for the parent overview and the Super Admin's student record.
// The group (Pre-Engineering, Biology …) has to be chosen before the card can be downloaded: a parent chooses it
// once, and the Super Admin can change it at any time. The same goes for the picture.
export function StudentIdCard({ studentId, studentName, role }: { studentId: string; studentName: string; role: 'parent' | 'super_admin' }) {
  const [photo, setPhoto] = useState<boolean | null>(null);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<'upload' | 'download' | 'group' | null>(null);

  const refresh = useCallback(async () => {
    const [hasPhoto, info] = await Promise.all([hasCardPhoto(studentId), fetchCardGroup(studentId)]);
    setPhoto(hasPhoto);
    setGroup(info);
  }, [studentId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const canUpload = role === 'super_admin' || photo === false;
  const needsGroup = group !== null && group.group === null;

  async function upload() {
    setBusy('upload');
    const res = await pickAndUploadCardPhoto(studentId);
    setBusy(null);
    if (!res.ok) Alert.alert('Could not upload picture', res.error);
    await refresh();
  }

  function confirmUpload() {
    if (role === 'super_admin') { void upload(); return; }
    Alert.alert('Upload picture', 'You can upload the picture only one time. Continue and choose the picture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Choose picture', onPress: () => void upload() },
    ]);
  }

  async function save(choice: string) {
    setBusy('group');
    const res = await saveCardGroup(studentId, choice);
    setBusy(null);
    if (!res.ok) Alert.alert('Could not save the group', res.error);
    await refresh();
  }

  function confirmGroup() {
    if (!draft) return;
    if (role === 'super_admin') { void save(draft); return; }
    Alert.alert('Save group', `You can choose the group only one time. Save “${draft}” for ${studentName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save group', onPress: () => void save(draft) },
    ]);
  }

  async function download() {
    setBusy('download');
    const res = await downloadIdCard(studentId, studentName);
    setBusy(null);
    if (!res.ok) Alert.alert('Could not download ID card', res.error);
    await refresh();
  }

  return (
    <Card>
      <ThemedText variant="bodyMedium">Student ID card</ThemedText>

      {group && (
        <View style={{ marginTop: Spacing.three, gap: Spacing.two }}>
          <ThemedText variant="label" color="textSecondary">GROUP (PRINTED ON THE CARD)</ThemedText>
          {needsGroup ? (
            <>
              <ThemedText variant="small" color="textSecondary">Choose the group first. The card can only be downloaded after this.</ThemedText>
              <View style={styles.row}>
                {group.options.map((g) => <Chip key={g} label={g} active={draft === g} disabled={busy !== null} onPress={() => setDraft(g)} />)}
              </View>
              {role === 'parent' && (
                <View style={[styles.notice, { backgroundColor: Semantic.warningBg }]}>
                  <ThemedText variant="small" style={{ color: Semantic.warning }}>Note: you can choose the group only one time. Please choose it carefully.</ThemedText>
                </View>
              )}
              <Button label="Save group" loading={busy === 'group'} disabled={!draft || busy !== null} onPress={confirmGroup} />
            </>
          ) : group.canChange ? (
            <>
              <View style={styles.row}>
                {group.options.map((g) => <Chip key={g} label={g} active={group.group === g} disabled={busy !== null} onPress={() => { if (g !== group.group) void save(g); }} />)}
              </View>
              <ThemedText variant="small" color="textSecondary">As Super Admin you can change the group at any time.</ThemedText>
            </>
          ) : (
            <ThemedText variant="small">{group.group} · To change it, please contact the academy office.</ThemedText>
          )}
        </View>
      )}

      <ThemedText variant="small" color="textSecondary" style={{ marginTop: Spacing.three }}>
        {photo === null ? 'Checking picture…'
          : photo ? (role === 'parent' ? 'Picture saved. To change it, please contact the academy office.' : 'Picture saved. You can replace it at any time.')
          : 'No picture yet. Note: you can upload the picture only one time.'}
      </ThemedText>
      <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
        {canUpload && photo !== null && (
          <Button label={photo ? 'Change picture' : 'Upload picture'} variant="secondary" loading={busy === 'upload'} disabled={busy !== null} onPress={confirmUpload} />
        )}
        <Button label="Download ID card" loading={busy === 'download'} disabled={busy !== null || needsGroup} onPress={download} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: Radius.pill, paddingVertical: 7, paddingHorizontal: 12 },
  notice: { borderRadius: Radius.md, padding: Spacing.three },
});
