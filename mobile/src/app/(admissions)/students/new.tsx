import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { AlertCircle, Check, CheckCircle2, KeyRound, Users } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { TextField } from '@/components/ui/text-field';
import { Ink, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { enrolStudentAction, type EnrolStudentResult } from '@/lib/actions/enrol-student';
import { PROGRAMS, PROGRAM_GRADE, sectionsForGrade, type Program } from '@/lib/students/constants';

const STREAMS = ['Pre-Engineering', 'Pre-Medical', 'Computer Science', 'Commerce'] as const;

type Status = 'idle' | 'submitting' | 'success' | 'error';

// Programme IS the grade choice (SSC-1/2 = grade 9/10, HSC-1/2 = grade
// 11/12) — no separate grade picker.
const emptyForm = {
  studentName: '', program: PROGRAMS[0] as Program, section: sectionsForGrade(PROGRAM_GRADE[PROGRAMS[0]])[0],
  isLate: false, stream: '' as typeof STREAMS[number] | '',
  parentName: '', parentPhone: '', parentSecondaryPhone: '', parentWhatsapp2: '', guardianProfession: '', address: '',
  previousSchool: '', lastQualification: '', grNumber: '', registrationFee: '', tuitionFee: '',
};

export default function EnrolStudentScreen() {
  const theme = useTheme();
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<Extract<EnrolStudentResult, { ok: true }> | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Section options depend on grade (9-10 are Boys/Girls, 11-12 are A-D) —
  // reset to the first valid option whenever the programme (= grade) changes.
  function setProgram(program: string) {
    const p = program as Program;
    const valid = sectionsForGrade(PROGRAM_GRADE[p]);
    setForm((f) => ({ ...f, program: p, section: valid.includes(f.section) ? f.section : valid[0] }));
  }

  async function handleSubmit() {
    setStatus('submitting');
    setError('');

    const outcome = await enrolStudentAction({
      studentName: form.studentName,
      grade: PROGRAM_GRADE[form.program],
      section: form.section,
      program: form.program,
      isLate: form.isLate,
      parentName: form.parentName,
      parentPhone: form.parentPhone,
      parentSecondaryPhone: form.parentSecondaryPhone || undefined,
      parentWhatsapp2: form.parentWhatsapp2 || undefined,
      guardianProfession: form.guardianProfession || undefined,
      previousSchool: form.previousSchool || undefined,
      lastQualification: form.lastQualification || undefined,
      address: form.address || undefined,
      grNumber: form.grNumber,
      registrationFee: form.registrationFee ? Number(form.registrationFee) : undefined,
      tuitionFee: form.tuitionFee ? Number(form.tuitionFee) : undefined,
      stream: form.stream || undefined,
    });

    if (!outcome.ok) {
      setError(outcome.error);
      setStatus('error');
      return;
    }
    setResult(outcome);
    setStatus('success');
  }

  async function copyCredentials() {
    if (!result) return;
    const text = result.parentAccountType === 'new'
      ? `Roll: ${result.rollNumber}\nRegistration: ${result.registrationNumber}\nUsername: ${result.username}\nTemporary password: ${result.tempPassword}`
      : `Roll: ${result.rollNumber}\nRegistration: ${result.registrationNumber}\nLinked to existing parent account: ${result.username}`;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const grade = PROGRAM_GRADE[form.program];
  const isIntermediate = grade === '11' || grade === '12';
  const canSubmit = form.studentName.trim().length > 0 && form.grNumber.trim().length > 0 && form.parentName.trim().length > 0 && form.parentPhone.trim().length > 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Enrol Student" subtitle="Parent login is issued automatically" onBack={() => router.back()} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {status === 'success' && result ? (
            <Card style={styles.successCard}>
              <View style={styles.successIcon}>
                <CheckCircle2 size={26} color={Semantic.success} />
              </View>
              <ThemedText variant="bodyMedium">{form.studentName} enrolled</ThemedText>
              <ThemedText variant="small" color="textSecondary" style={{ textAlign: 'center' }}>
                Grade {grade}-{form.section} · {form.program}{form.isLate ? ' · Late enrollment (watch-time tracking enabled)' : ''}
              </ThemedText>

              {result.parentAccountType === 'new' ? (
                <View style={[styles.credentialsBox, { backgroundColor: theme.accentSurface }]}>
                  <View style={styles.credentialsHeader}>
                    <KeyRound size={14} color={Ink[600]} />
                    <ThemedText variant="small" style={{ color: Ink[700] }}>Parent credentials — auto-issued</ThemedText>
                  </View>
                  <CredentialRow label="Roll number" value={result.rollNumber} />
                  <CredentialRow label="Registration number" value={result.registrationNumber} />
                  <CredentialRow label="Username" value={result.username} />
                  <CredentialRow label="Temp password" value={result.tempPassword} />
                  <Button label={copied ? 'Copied' : 'Copy credentials'} variant="secondary" onPress={copyCredentials} fullWidth />
                </View>
              ) : (
                <View style={[styles.credentialsBox, { backgroundColor: Semantic.warningBg }]}>
                  <View style={styles.credentialsHeader}>
                    <Users size={14} color={Semantic.warning} />
                    <ThemedText variant="small" style={{ color: Semantic.warning }}>Linked to an existing parent account</ThemedText>
                  </View>
                  <ThemedText variant="small" color="textSecondary">
                    This phone number already has a parent account — {form.studentName} was added as a sibling. No new credentials were issued.
                  </ThemedText>
                  <CredentialRow label="Roll number" value={result.rollNumber} />
                  <CredentialRow label="Registration number" value={result.registrationNumber} />
                  <CredentialRow label="Parent username" value={result.username} />
                </View>
              )}

              <View style={styles.successActions}>
                <Button label="View Directory" variant="secondary" onPress={() => router.replace('/admissions')} />
                <Button label="Enrol Another" onPress={() => { setForm(emptyForm); setResult(null); setStatus('idle'); }} />
              </View>
            </Card>
          ) : (
            <View style={{ gap: Spacing.four }}>
              {status === 'error' && (
                <View style={[styles.errorBanner, { backgroundColor: Semantic.dangerBg }]}>
                  <AlertCircle size={14} color={Semantic.danger} />
                  <ThemedText variant="small" style={{ color: Semantic.danger, flex: 1 }}>{error}</ThemedText>
                </View>
              )}

              <View style={{ gap: Spacing.three }}>
                <ThemedText variant="label" color="textMuted">Student Information</ThemedText>
                <TextField label="Student full name" placeholder="e.g. Zoya Ahmed" value={form.studentName} onChangeText={(v) => set('studentName', v)} />
                <TextField label="G.R. No." placeholder="e.g. 4821" value={form.grNumber} onChangeText={(v) => set('grNumber', v)} />
                <ChipSelect label="Programme" options={PROGRAMS} value={form.program} onChange={setProgram} />
                <ChipSelect label="Section" options={sectionsForGrade(PROGRAM_GRADE[form.program])} value={form.section} onChange={(v) => set('section', v)} />

                <Pressable onPress={() => set('isLate', !form.isLate)} style={[styles.lateToggle, { backgroundColor: Semantic.warningBg }]}>
                  <View style={[styles.checkbox, form.isLate && { backgroundColor: Semantic.warning, borderColor: Semantic.warning }]}>
                    {form.isLate && <Check size={12} color="#FFFFFF" />}
                  </View>
                  <ThemedText variant="small" style={{ color: Semantic.warning, flex: 1, lineHeight: 18 }}>
                    Late enrollment — enables strict video watch-time tracking for lecture catch-up.
                  </ThemedText>
                </Pressable>

                {isIntermediate && (
                  <ChipSelect label="Stream (Intermediate)" options={STREAMS} value={form.stream || STREAMS[0]} onChange={(v) => set('stream', v)} />
                )}
              </View>

              <View style={{ gap: Spacing.three }}>
                <ThemedText variant="label" color="textMuted">Academic Background (optional)</ThemedText>
                <TextField label="School / college" placeholder="e.g. City Public School" value={form.previousSchool} onChangeText={(v) => set('previousSchool', v)} />
                <TextField label="Last qualification" placeholder="e.g. Grade 8 · Distinction" value={form.lastQualification} onChangeText={(v) => set('lastQualification', v)} />
              </View>

              <View style={{ gap: Spacing.three }}>
                <ThemedText variant="label" color="textMuted">Parent / Guardian</ThemedText>
                <TextField label="Parent's name" placeholder="e.g. Mr. Ahmed Raza" value={form.parentName} onChangeText={(v) => set('parentName', v)} />
                <TextField label="WhatsApp No." placeholder="03XX XXXXXXX" value={form.parentPhone} onChangeText={(v) => set('parentPhone', v)} keyboardType="phone-pad" />
                <TextField label="Phone No. (optional)" placeholder="03XX XXXXXXX" value={form.parentSecondaryPhone} onChangeText={(v) => set('parentSecondaryPhone', v)} keyboardType="phone-pad" />
                <TextField label="WhatsApp 2 (optional)" placeholder="03XX XXXXXXX" value={form.parentWhatsapp2} onChangeText={(v) => set('parentWhatsapp2', v)} keyboardType="phone-pad" />
                <TextField label="Profession (optional)" placeholder="e.g. Engineer" value={form.guardianProfession} onChangeText={(v) => set('guardianProfession', v)} />
                <TextField label="Address (optional)" placeholder="House / street / area" value={form.address} onChangeText={(v) => set('address', v)} />
              </View>

              <View style={{ gap: Spacing.three }}>
                <ThemedText variant="label" color="textMuted">Office Use (optional)</ThemedText>
                <TextField label="Registration fee (PKR)" value={form.registrationFee} onChangeText={(v) => set('registrationFee', v)} keyboardType="numeric" />
                <TextField label="Tuition fee (PKR)" value={form.tuitionFee} onChangeText={(v) => set('tuitionFee', v)} keyboardType="numeric" />
              </View>

              <Button
                label={status === 'submitting' ? 'Enrolling…' : 'Enrol Student & Issue Parent Login'}
                loading={status === 'submitting'}
                disabled={!canSubmit}
                onPress={handleSubmit}
                fullWidth
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.credentialRow}>
      <ThemedText variant="small" color="textMuted">{label}</ThemedText>
      <ThemedText variant="mono" style={{ fontSize: 12 }}>{value}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, paddingTop: 0, paddingBottom: Spacing.six },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.md, padding: 12 },
  lateToggle: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.md, padding: 12 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: Semantic.warning, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  successCard: { alignItems: 'center', gap: Spacing.three, padding: Spacing.four },
  successIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: Semantic.successBg, alignItems: 'center', justifyContent: 'center' },
  credentialsBox: { width: '100%', borderRadius: Radius.lg, padding: Spacing.three, gap: 8 },
  credentialsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  credentialRow: { flexDirection: 'row', justifyContent: 'space-between' },
  successActions: { flexDirection: 'row', gap: Spacing.two, width: '100%' },
});
