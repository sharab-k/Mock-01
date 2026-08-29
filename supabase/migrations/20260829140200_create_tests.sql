-- Rollback: DROP TABLE IF EXISTS public.tests;

-- ── tests ────────────────────────────────────────────────────────────────────
-- Marks Admin's free-form test creation: any subject, any class, any number
-- of tests — additive alongside the existing fixed Monthly/Half-Yearly/Final
-- exam_type on `marks` (confirmed: keep those working as-is, don't replace
-- them). A "class" here is grade+section, matching the atomic unit the rest
-- of the app already uses for a class (attendance's marker-classes,
-- admissions' roster) — subjects themselves are grade-wide, but a specific
-- test is given to one section at a time.
CREATE TABLE public.tests (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id   uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  grade_level  text NOT NULL,
  section      text NOT NULL,
  title        text NOT NULL,
  max_score    integer NOT NULL DEFAULT 100,
  test_date    date NOT NULL DEFAULT current_date,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (max_score > 0)
);

CREATE INDEX idx_tests_subject ON public.tests(subject_id);
CREATE INDEX idx_tests_class ON public.tests(grade_level, section);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marks_staff_manage_tests"
  ON public.tests FOR ALL
  USING (public.current_role() IN ('marks_admin', 'super_admin'))
  WITH CHECK (public.current_role() IN ('marks_admin', 'super_admin'));

CREATE POLICY "parent_read_linked_children_tests"
  ON public.tests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.students s ON s.id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND s.grade_level = tests.grade_level AND s.section = tests.section
  ));
