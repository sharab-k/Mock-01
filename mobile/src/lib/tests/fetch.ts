import { supabase } from '@/lib/supabase/client';
import { callMobileApi } from '@/lib/api/client';

export type TestSummary = {
  id: string;
  subjectId: string;
  subjectName: string;
  gradeLevel: string;
  section: string;
  title: string;
  maxScore: number;
  testDate: string;
  entriesCount: number;
};

// Ported from the web's lib/actions/tests.ts fetchTests — direct RLS-scoped
// read, same reasoning as lib/subjects/fetch.ts.
export async function fetchTests(): Promise<TestSummary[]> {
  const [testsRes, marksRes] = await Promise.all([
    supabase.from('tests').select('id, subject_id, grade_level, section, title, max_score, test_date, subjects(name)').order('test_date', { ascending: false }),
    supabase.from('marks').select('test_id').not('test_id', 'is', null),
  ]);

  const countByTest = new Map<string, number>();
  for (const row of marksRes.data ?? []) {
    if (!row.test_id) continue;
    countByTest.set(row.test_id, (countByTest.get(row.test_id) ?? 0) + 1);
  }

  return (testsRes.data ?? []).map((t) => ({
    id: t.id,
    subjectId: t.subject_id,
    subjectName: t.subjects?.name ?? '—',
    gradeLevel: t.grade_level,
    section: t.section,
    title: t.title,
    maxScore: t.max_score,
    testDate: t.test_date,
    entriesCount: countByTest.get(t.id) ?? 0,
  }));
}

export type TestRosterStudent = { id: string; fullName: string; rollNumber: string; score: number | null };

// Ported from the web's fetchTestRoster — compulsory subject shows the
// whole class, elected subject shows only enrolled students.
export async function fetchTestRoster(
  testId: string,
): Promise<{ ok: true; test: TestSummary; roster: TestRosterStudent[] } | { ok: false; error: string }> {
  const { data: test } = await supabase
    .from('tests')
    .select('id, subject_id, grade_level, section, title, max_score, test_date, subjects(name, type)')
    .eq('id', testId)
    .single();
  if (!test) return { ok: false, error: 'Test not found.' };

  const studentsQuery = supabase
    .from('students')
    .select('id, full_name, roll_number')
    .is('deleted_at', null)
    .eq('status', 'active')
    .eq('grade_level', test.grade_level)
    .eq('section', test.section)
    .order('roll_number', { ascending: true });

  const [studentsRes, enrolledRes, marksRes] = await Promise.all([
    studentsQuery,
    test.subjects?.type === 'elected'
      ? supabase.from('student_subject_enrollments').select('student_id').eq('subject_id', test.subject_id)
      : Promise.resolve({ data: null as { student_id: string }[] | null }),
    supabase.from('marks').select('student_id, score').eq('test_id', testId),
  ]);

  const scoreByStudent = new Map((marksRes.data ?? []).map((m) => [m.student_id, m.score]));
  const eligibleIds = test.subjects?.type === 'elected' ? new Set((enrolledRes.data ?? []).map((r) => r.student_id)) : null;

  const roster = (studentsRes.data ?? [])
    .filter((s) => !eligibleIds || eligibleIds.has(s.id))
    .map((s) => ({
      id: s.id,
      fullName: s.full_name,
      rollNumber: s.roll_number,
      score: scoreByStudent.get(s.id) ?? null,
    }));

  return {
    ok: true,
    test: {
      id: test.id,
      subjectId: test.subject_id,
      subjectName: test.subjects?.name ?? '—',
      gradeLevel: test.grade_level,
      section: test.section,
      title: test.title,
      maxScore: test.max_score,
      testDate: test.test_date,
      entriesCount: roster.filter((r) => r.score !== null).length,
    },
    roster,
  };
}

export async function createTestAction(input: {
  subjectId: string; gradeLevel: string; section: string; title: string; maxScore: number; testDate?: string;
}) {
  return callMobileApi<{ id: string }>('/api/mobile/tests', input);
}

export async function bulkSaveTestMarksAction(testId: string, entries: { studentId: string; studentName: string; score: number }[]) {
  return callMobileApi<{ inserted: number; updated: number; notified: number }>(`/api/mobile/tests/${testId}/marks`, { entries });
}
