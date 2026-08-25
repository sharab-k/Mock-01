import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Trash2, X } from 'lucide-react-native';

import { ScreenHeader } from '@/components/screen-header';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { StatusPill } from '@/components/ui/status-pill';
import { TextField } from '@/components/ui/text-field';
import { SetPasswordModal } from '@/components/set-password-modal';
import { Ink, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  fetchStudentDirectory, updateStudentAction, deleteStudentAction, updateParentContactAction,
  type DirectoryStudent,
} from '@/lib/students/directory';
import { setParentPasswordAction } from '@/lib/actions/parents';
import { GRADES, PROGRAMS, PROGRAM_GRADE, sectionsForGrade, type Program, type Section } from '@/lib/students/constants';

const STREAMS = ['Pre-Engineering', 'Pre-Medical', 'Computer Science', 'Commerce'] as const;

export default function StudentDirectoryScreen() {
  const theme = useTheme();
  const [students, setStudents] = useState<DirectoryStudent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('All');
  const [feeFilter, setFeeFilter] = useState<'All' | 'Paid' | 'Unpaid'>('All');
  const [editTarget, setEditTarget] = useState<DirectoryStudent | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<DirectoryStudent | null>(null);

  function load() {
    fetchStudentDirectory().then((result) => {
      if (!result.ok) { setError(result.error); return; }
      setStudents(result.students);
    });
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!students) return [];
    const q = query.trim().toLowerCase();
    return students.filter((s) => {
      const matchesQuery = !q || s.full_name.toLowerCase().includes(q) || s.roll_number.toLowerCase().includes(q) || (s.gr_number ?? '').toLowerCase().includes(q);
      const matchesGrade = gradeFilter === 'All' || s.grade === gradeFilter;
      const matchesFee = feeFilter === 'All' || (feeFilter === 'Paid' ? s.fee_status === 'paid' : s.fee_status === 'unpaid');
      return matchesQuery && matchesGrade && matchesFee;
    });
  }, [students, query, gradeFilter, feeFilter]);

  function handleDelete(s: DirectoryStudent) {
    Alert.alert('Delete student record?', `${s.full_name} will be removed from the active directory. History is preserved.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const outcome = await deleteStudentAction(s.id);
          if (outcome.ok) { setEditTarget(null); load(); }
        },
      },
    ]);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ScreenHeader title="Student Directory" subtitle={students ? `${students.length} students` : undefined} onBack={() => router.back()} />
        </View>

        {error && <View style={styles.centered}><ThemedText color="textSecondary">{error}</ThemedText></View>}
        {!error && !students && <View style={styles.centered}><ActivityIndicator color={theme.accent} /></View>}

        {students && (
          <ScrollView contentContainerStyle={styles.list}>
            <TextField placeholder="Search by name, roll, or G.R. no…" value={query} onChangeText={setQuery} autoCapitalize="none" />
            <ChipSelect label="Grade" options={['All', ...GRADES] as const} value={gradeFilter} onChange={setGradeFilter} />
            <ChipSelect label="Fee status" options={['All', 'Paid', 'Unpaid'] as const} value={feeFilter} onChange={setFeeFilter} />

            {filtered.length === 0 && (
              <ThemedText color="textSecondary" style={{ textAlign: 'center', marginTop: Spacing.four }}>No students match this filter.</ThemedText>
            )}
            {filtered.filter(Boolean).map((s) => (
              <Pressable key={s.id} onPress={() => setEditTarget(s)}>
                <Card style={{ gap: 6 }}>
                  <View style={styles.row}>
                    <Avatar name={s.full_name} size={36} />
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="small">{s.full_name}</ThemedText>
                      <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>
                        {s.roll_number}{s.gr_number ? ` · GR ${s.gr_number}` : ''}
                      </ThemedText>
                    </View>
                    <StatusPill tone={s.status === 'Active' ? 'success' : 'neutral'} label={s.status} />
                  </View>
                  <View style={styles.rowBetween}>
                    <ThemedText variant="mono" color="textSecondary" style={{ fontSize: 12 }}>{s.grade}{s.section} · {s.program}</ThemedText>
                    <StatusPill tone={s.fee_status === 'paid' ? 'success' : 'danger'} label={s.fee_status === 'paid' ? 'Paid' : 'Unpaid'} />
                  </View>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {editTarget && (
          <EditStudentModal
            student={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={() => { setEditTarget(null); load(); }}
            onDelete={() => handleDelete(editTarget)}
            onResetPassword={() => setPasswordTarget(editTarget)}
          />
        )}

        <SetPasswordModal
          visible={!!passwordTarget}
          targetName={passwordTarget?.parent_name ?? ''}
          username={passwordTarget?.parent_email ?? '—'}
          onClose={() => setPasswordTarget(null)}
          onSubmit={(newPassword) => setParentPasswordAction({ id: passwordTarget!.parent_id!, newPassword })}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

function EditStudentModal({
  student, onClose, onSaved, onDelete, onResetPassword,
}: {
  student: DirectoryStudent;
  onClose: () => void;
  onSaved: () => void;
  onDelete: () => void;
  onResetPassword: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(student.full_name);
  const [program, setProgram] = useState<Program>(student.program);
  const [section, setSection] = useState<Section>(student.section);
  const [isLate, setIsLate] = useState(student.is_late_enrollment);
  const [stream, setStream] = useState(student.stream ?? '');
  const [previousSchool, setPreviousSchool] = useState(student.previous_school ?? '');
  const [lastQualification, setLastQualification] = useState(student.last_qualification ?? '');
  const [grNumber, setGrNumber] = useState(student.gr_number ?? '');
  const [rollNumber, setRollNumber] = useState(student.roll_number);
  const [parentName, setParentName] = useState(student.parent_name);
  const [parentPhone, setParentPhone] = useState(student.parent_phone);
  const [guardianProfession, setGuardianProfession] = useState(student.guardian_profession ?? '');
  const [address, setAddress] = useState(student.address ?? '');
  const [registrationFee, setRegistrationFee] = useState(student.registration_fee !== null ? String(student.registration_fee) : '');
  const [tuitionFee, setTuitionFee] = useState(student.tuition_fee !== null ? String(student.tuition_fee) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const grade = PROGRAM_GRADE[program];
  const isIntermediate = grade === '11' || grade === '12' || grade === 'ICOM-1' || grade === 'ICOM-2';

  async function handleSave() {
    setSaving(true);
    setError('');
    const outcome = await updateStudentAction(student.id, {
      fullName: name,
      program,
      section,
      isLate,
      stream: stream || undefined,
      previousSchool: previousSchool || undefined,
      lastQualification: lastQualification || undefined,
      address: address || undefined,
      guardianProfession: guardianProfession || undefined,
      grNumber: grNumber || undefined,
      rollNumber: rollNumber || undefined,
      registrationFee: registrationFee ? Number(registrationFee) : undefined,
      tuitionFee: tuitionFee ? Number(tuitionFee) : undefined,
    });
    if (!outcome.ok) { setSaving(false); setError(outcome.error); return; }

    if (student.parent_id) {
      const parentOutcome = await updateParentContactAction({ id: student.parent_id, fullName: parentName, phone: parentPhone });
      if (!parentOutcome.ok) { setSaving(false); setError(parentOutcome.error); return; }
    }
    setSaving(false);
    onSaved();
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ThemedView style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="title" style={{ fontSize: 20 }}>Edit Student</ThemedText>
              <ThemedText variant="mono" color="textMuted" style={{ fontSize: 12 }}>{student.roll_number}</ThemedText>
            </View>
            <Pressable onPress={onClose} hitSlop={8}><X size={20} color={theme.textSecondary} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {!!error && (
              <View style={[styles.errorBanner, { backgroundColor: Semantic.dangerBg }]}>
                <ThemedText variant="small" style={{ color: Semantic.danger }}>{error}</ThemedText>
              </View>
            )}

            <ThemedText variant="label" color="textMuted">Student Information</ThemedText>
            <TextField label="Full name" value={name} onChangeText={setName} />
            <TextField label="G.R. No. (Super Admin only)" value={grNumber} onChangeText={setGrNumber} placeholder="e.g. 4821" />
            <TextField label="Roll Number (Super Admin only)" value={rollNumber} onChangeText={setRollNumber} />
            <ChipSelect label="Programme" options={PROGRAMS} value={program} onChange={(v) => { setProgram(v); const valid = sectionsForGrade(PROGRAM_GRADE[v]); if (!valid.includes(section)) setSection(valid[0]); }} />
            <ChipSelect label="Section" options={sectionsForGrade(grade)} value={section} onChange={setSection} />
            {isIntermediate && (
              <ChipSelect label="Stream" options={['', ...STREAMS] as const} value={stream} onChange={setStream} />
            )}
            <Pressable onPress={() => setIsLate(!isLate)} style={[styles.lateToggle, { backgroundColor: Semantic.warningBg }]}>
              <View style={[styles.checkbox, isLate && { backgroundColor: Semantic.warning, borderColor: Semantic.warning }]} />
              <ThemedText variant="small" style={{ color: Semantic.warning, flex: 1 }}>Late enrollment — strict video watch-time tracking</ThemedText>
            </Pressable>

            <ThemedText variant="label" color="textMuted" style={{ marginTop: Spacing.two }}>Academic Background</ThemedText>
            <TextField label="School / college" value={previousSchool} onChangeText={setPreviousSchool} />
            <TextField label="Last qualification" value={lastQualification} onChangeText={setLastQualification} />

            <ThemedText variant="label" color="textMuted" style={{ marginTop: Spacing.two }}>Parent / Guardian</ThemedText>
            <TextField label="Parent's name" value={parentName} onChangeText={setParentName} editable={!!student.parent_id} />
            <TextField label="WhatsApp No." value={parentPhone} onChangeText={setParentPhone} editable={!!student.parent_id} keyboardType="phone-pad" />
            <TextField label="Profession (optional)" value={guardianProfession} onChangeText={setGuardianProfession} />
            <TextField label="Address (optional)" value={address} onChangeText={setAddress} />
            {student.parent_id && (
              <Pressable onPress={onResetPassword} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
                <ThemedText variant="small" style={{ color: Ink[600] }}>Reset parent password</ThemedText>
              </Pressable>
            )}

            <ThemedText variant="label" color="textMuted" style={{ marginTop: Spacing.two }}>Office Use</ThemedText>
            <TextField label="Registration fee (PKR)" value={registrationFee} onChangeText={setRegistrationFee} keyboardType="numeric" />
            <TextField label="Tuition fee (PKR)" value={tuitionFee} onChangeText={setTuitionFee} keyboardType="numeric" />

            <Button label={saving ? 'Saving…' : 'Save Changes'} loading={saving} onPress={handleSave} fullWidth />
            <Pressable onPress={onDelete} style={styles.deleteBtn}>
              <Trash2 size={14} color={Semantic.danger} />
              <ThemedText variant="small" style={{ color: Semantic.danger }}>Delete Student Record</ThemedText>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  list: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  modalContent: { padding: Spacing.four, paddingTop: 0, gap: Spacing.three, paddingBottom: Spacing.six },
  errorBanner: { borderRadius: 10, padding: Spacing.three },
  lateToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 10, padding: Spacing.three },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: Semantic.warning },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
});
