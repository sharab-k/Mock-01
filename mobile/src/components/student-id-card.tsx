import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { downloadIdCard, hasCardPhoto, pickAndUploadCardPhoto } from '@/lib/cards/id-card';

// ID card section for the parent overview and the Super Admin's student record.
// Parents may upload the picture once; the Super Admin can replace it anytime.
export function StudentIdCard({ studentId, studentName, role }: { studentId: string; studentName: string; role: 'parent' | 'super_admin' }) {
  const [photo, setPhoto] = useState<boolean | null>(null);
  const [busy, setBusy] = useState<'upload' | 'download' | null>(null);

  const refresh = useCallback(async () => setPhoto(await hasCardPhoto(studentId)), [studentId]);
  useEffect(() => { void refresh(); }, [refresh]);

  const canUpload = role === 'super_admin' || photo === false;

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

  async function download() {
    setBusy('download');
    const res = await downloadIdCard(studentId, studentName);
    setBusy(null);
    if (!res.ok) Alert.alert('Could not download ID card', res.error);
  }

  return (
    <Card>
      <ThemedText variant="bodyMedium">Student ID card</ThemedText>
      <ThemedText variant="small" color="textSecondary" style={{ marginTop: Spacing.one }}>
        {photo === null ? 'Checking picture…'
          : photo ? (role === 'parent' ? 'Picture saved. To change it, please contact the academy office.' : 'Picture saved. You can replace it at any time.')
          : 'No picture yet. Note: you can upload the picture only one time.'}
      </ThemedText>
      <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
        {canUpload && photo !== null && (
          <Button label={photo ? 'Change picture' : 'Upload picture'} variant="secondary" loading={busy === 'upload'} disabled={busy !== null} onPress={confirmUpload} />
        )}
        <Button label="Download ID card" loading={busy === 'download'} disabled={busy !== null} onPress={download} />
      </View>
    </Card>
  );
}
