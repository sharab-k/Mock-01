-- Rollback: DROP TABLE IF EXISTS public.student_subject_exclusions;

-- Compulsory subjects apply to every active student in the grade implicitly
-- (no row needed). Super Admin sometimes needs to change that for a specific
-- student — e.g. a student who is exempt from a compulsory subject. An
-- exclusion row records exactly that exception; deleting it restores the
-- default. Mirrors student_subject_enrollments (which does the opposite job for
-- elected subjects: a row means "takes it").
CREATE TABLE public.student_subject_exclusions (
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  excluded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, subject_id)
);

CREATE INDEX idx_student_subject_exclusions_subject ON public.student_subject_exclusions(subject_id);

ALTER TABLE public.student_subject_exclusions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_manage_exclusions"
  ON public.student_subject_exclusions FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Marks Admin builds each test's roster, so it must see who is excluded.
CREATE POLICY "marks_admin_read_exclusions"
  ON public.student_subject_exclusions FOR SELECT
  USING (public.current_role() = 'marks_admin');

CREATE POLICY "parent_read_linked_children_exclusions"
  ON public.student_subject_exclusions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = student_subject_exclusions.student_id AND psl.parent_id = auth.uid()
  ));
