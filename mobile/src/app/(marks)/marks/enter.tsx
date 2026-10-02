import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle } from 'lucide-react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChipSelect } from '@/components/ui/chip-select';
import { TextField } from '@/components/ui/text-field';
import { FontFamily, Radius, Semantic, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { bulkSaveMarksAction } from '@/lib/actions/marks';
import { fetchMarksEntryData, type EnterRosterStudent, type ExistingMark } from '@/lib/marks/enter-data';
import { GRADES, sectionsForGrade } from '@/lib/students/constants';
import { fetchSubjects, type Subject } from '@/lib/subjects/fetch';

const EXAM_TYPES = [
  { value: 'monthly' as const, label: 'Monthly' },
  { value: 'half_yearly' as const, label: 'Half-Yearly' },
  { value: 'final' as const, label: 'Final' },
];
const EXAM_TYPE_LABELS = EXAM_TYPES.map((e) => e.label);

export default function MarksEnterScreen() {
  const theme = useTheme();
  const [fullRoster, setFullRoster] = useState<EnterRosterStudent[] | null>(null);
  const [existingMarks, setExistingMarks] = useState<ExistingMark[]>([]);
  const [grade, setGrade] = useState(GRADES[0]);
  const [section, setSection] = useState(sectionsForGrade(GRADES[0])[0]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectChoice, setSubjectChoice] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [examType, setExamType] = useState<'monthly' | 'half_yearly' | 'final'>('monthly');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  // Section options depend on grade (9-10 are Boys/Girls, 11-12 are A-D) —
  // reset to the first valid option whenever grade changes, set directly in
  // the handler rather than synced via effect.
  function handleGradeChange(g: typeof GRADES[number]) {
    setGrade(g);
    const valid = sectionsForGrade(g);
    if (!valid.includes(section)) setSection(valid[0]);
  }

  useEffect(() => {
    let mounted = true;
    Promise.all([fetchMarksEntryData(), fetchSubjects()]).then(([{ roster, existingMarks }, subjectList]) => {
      if (!mounted) return;
      setFullRoster(roster);
      setExistingMarks(existingMarks);
      setSubjects(subjectList);
    });
    return () => { mounted = false; };
  }, []);

  // The grade's real subject list (set up under Subjects) — derived rather than
  // synced via an effect, so a grade change can never leave a stale choice.
  const gradeSubjects = useMemo(() => subjects.filter((s) => s.gradeLevel === grade).map((s) => s.name), [subjects, grade]);
  const subject = gradeSubjects.includes(subjectChoice) ? subjectChoice : (gradeSubjects[0] ?? '');
  const maxScoreNum = Number(maxScore) || 0;

  const roster = useMemo(
    () => (fullRoster ?? []).filter((s) => s.grade === grade && s.section === section),
    [fullRoster, grade, section],
  );

  useEffect(() => {
    const prefill: Record<string, string> = {};
    let recordedMax: number | null = null;
    for (const s of roster) {
      const existing = existingMarks.find((m) => m.student_id === s.id && m.subject === subject && m.exam_type === examType);
      if (existing) {
        prefill[s.id] = String(existing.score);
        recordedMax = existing.max_score;
      }
    }
    // Deliberate: re-derives the entered-scores state whenever the
    // class/subject/exam selection changes, prefilling from any existing
    // marks — the same "reset on dependency change" pattern as the web's
    // MarksEnterContent.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScores(prefill);
    setMaxScore(String(recordedMax ?? 100));
    setStatus('idle');
  }, [roster, existingMarks, subject, examType]);

  function setScore(studentId: string, value: string) {
    if (value !== '' && (!/^\d{1,4}$/.test(value) || Number(value) > maxScoreNum)) return;
    setScores((prev) => ({ ...prev, [studentId]: value }));
    setStatus('idle');
  }

  const enteredCount = roster.filter((s) => scores[s.id] !== undefined && scores[s.id] !== '').length;

  async function handleSave() {
    setStatus('saving');
    setError('');

    const entries = roster
      .filter((s) => scores[s.id] !== undefined && scores[s.id] !== '')
      .map((s) => ({ studentId: s.id, studentName: s.full_name, score: Number(scores[s.id]) }));

    const over = entries.find((e) => e.score > maxScoreNum);
    if (over) {
      setError(`${over.studentName}'s score is above the total of ${maxScoreNum}. Raise the total or correct the score.`);
      setStatus('error');
      return;
    }

    const outcome = await bulkSaveMarksAction({ subject, examType, maxScore: maxScoreNum, classLabel: `Grade ${grade}-${section}`, entries });

    if (!outcome.ok) {
      setError(outcome.error);
      setStatus('error');
      return;
    }
    setStatus('saved');
    setTimeout(() => setStatus('idle'), 3000);
  }

  if (!fullRoster) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={[styles.safeArea, styles.centered]}>
          <ActivityIndicator color={theme.accent} />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <ThemedText variant="title" style={{ fontSize: 20, lineHeight: 26 }}>Enter Marks</ThemedText>
          <ThemedText variant="small" color="textSecondary">Bulk entry for one class, subject, and exam at a time</ThemedText>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={{ gap: Spacing.three }}>
            <ChipSelect label="Grade" options={GRADES} value={grade} onChange={handleGradeChange} />
            <ChipSelect label="Section" options={sectionsForGrade(grade)} value={section} onChange={setSection} />
            {gradeSubjects.length === 0 ? (
              <ThemedText variant="small" color="textMuted">No subjects set up for Grade {grade} yet — add them under Manage subjects.</ThemedText>
            ) : (
              <ChipSelect label="Subject" options={gradeSubjects} value={subject} onChange={setSubjectChoice} />
            )}
            <ChipSelect
              label="Exam type"
              options={EXAM_TYPE_LABELS}
              value={EXAM_TYPES.find((e) => e.value === examType)!.label}
              onChange={(label) => setExamType(EXAM_TYPES.find((e) => e.label === label)!.value)}
            />
            <TextField label="Total marks" value={maxScore} onChangeText={(v) => setMaxScore(v.replace(/D/g, '').slice(0, 4))} keyboardType="number-pad" />
          </View>

          {status === 'error' && (
            <View style={[styles.errorBanner, { backgroundColor: Semantic.dangerBg }]}>
              <AlertCircle size={14} color={Semantic.danger} />
              <ThemedText variant="small" style={{ color: Semantic.danger, flex: 1 }}>{error}</ThemedText>
            </View>
          )}

          <View>
            <View style={styles.listHeader}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="bodyMedium">
                  Grade {grade}-{section} · {subject}
                </ThemedText>
                <ThemedText variant="small" color="textMuted">{enteredCount} of {roster.length} scores entered</ThemedText>
              </View>
              <Button
                label={status === 'saved' ? 'Saved' : status === 'saving' ? 'Saving…' : 'Save All'}
                variant={status === 'saved' ? 'secondary' : 'primary'}
                loading={status === 'saving'}
                disabled={enteredCount === 0 || !subject || maxScoreNum < 1}
                onPress={handleSave}
                size="sm"
              />
            </View>

            <Card style={{ gap: 0, padding: 0, overflow: 'hidden' }}>
              {roster.length === 0 ? (
                <ThemedText color="textSecondary" style={{ padding: Spacing.four, textAlign: 'center' }}>
                  No students in this class.
                </ThemedText>
              ) : (
                roster.map((s, i) => (
                  <View key={s.id} style={[styles.studentRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }]}>
                    <Avatar name={s.full_name} size={32} />
                    <View style={{ flex: 1 }}>
                      <ThemedText variant="small" numberOfLines={1}>{s.full_name}</ThemedText>
                      <ThemedText variant="mono" color="textMuted" style={{ fontSize: 11 }}>{s.roll_number}</ThemedText>
                    </View>
                    <TextInput
                      value={scores[s.id] ?? ''}
                      onChangeText={(v) => setScore(s.id, v)}
                      placeholder="—"
                      keyboardType="number-pad"
                      style={[styles.scoreInput, { borderColor: theme.border, color: theme.text, fontFamily: FontFamily.mono }]}
                      placeholderTextColor={theme.textMuted}
                    />
                    <ThemedText variant="mono" color="textMuted" style={{ fontSize: 12 }}>/ {maxScoreNum}</ThemedText>
                  </View>
                ))
              )}
            </Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: Spacing.four, paddingBottom: Spacing.two },
  content: { padding: Spacing.four, paddingTop: 0, gap: Spacing.four, paddingBottom: Spacing.six },
  errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: Radius.md, padding: 12 },
  listHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginBottom: Spacing.two },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 10, paddingHorizontal: Spacing.three },
  scoreInput: { width: 48, textAlign: 'center', borderWidth: 1, borderRadius: Radius.sm, paddingVertical: 6, fontSize: 13 },
});
