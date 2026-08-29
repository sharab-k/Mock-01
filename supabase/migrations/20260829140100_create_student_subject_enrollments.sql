-- Rollback: DROP TABLE IF EXISTS public.student_subject_enrollments;

-- ── student_subject_enrollments ─────────────────────────────────────────────
-- Only meaningful for 'elected' subjects — a compulsory subject applies to
-- every active student in its grade implicitly (derived at query time from
-- students.grade_level, never a row here). Super Admin enrolls students in
-- an elected subject in bulk from the class roster (confirmed workflow).
-- No CHECK constraint tying this to subjects.type = 'elected' (Postgres
-- can't express a cross-row CHECK) — enforced at the application layer
-- instead, same trust boundary as everywhere else RLS is the real boundary
-- and app logic is the UX layer on top (CLAUDE.md golden rule 8).
CREATE TABLE public.student_subject_enrollments (
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id  uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  enrolled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, subject_id)
);

CREATE INDEX idx_student_subject_enrollments_subject ON public.student_subject_enrollments(subject_id);

ALTER TABLE public.student_subject_enrollments ENABLE ROW LEVEL SECURITY;

-- Only Super Admin enrolls/unenrolls students in elected subjects.
CREATE POLICY "super_admin_manage_enrollments"
  ON public.student_subject_enrollments FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Marks Admin needs to read enrollments to build the correct roster when
-- creating a test for an elected subject (only enrolled students, not the
-- whole class).
CREATE POLICY "marks_admin_read_enrollments"
  ON public.student_subject_enrollments FOR SELECT
  USING (public.current_role() = 'marks_admin');

CREATE POLICY "parent_read_linked_children_enrollments"
  ON public.student_subject_enrollments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = student_subject_enrollments.student_id AND psl.parent_id = auth.uid()
  ));
