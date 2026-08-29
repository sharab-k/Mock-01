-- Rollback: DROP TABLE IF EXISTS public.subjects; DROP TYPE IF EXISTS public.subject_type;

-- ── subjects ─────────────────────────────────────────────────────────────────
-- Super Admin's per-grade subject list (confirmed scope: whole grade, not
-- per-section — every section in a grade shares one subject list).
-- 'compulsory' subjects apply to every active student in the grade
-- implicitly, no enrollment row needed. 'elected' subjects need an explicit
-- student_subject_enrollments row (next migration) — nobody is enrolled
-- until Super Admin says so.
--
-- Soft delete (deleted_at), not a hard DELETE — "remove a subject" must not
-- orphan or silently vanish historical marks/tests already recorded against
-- it (CLAUDE.md's "edits are logged, never silently overwritten" spirit
-- extends here: a removed subject stops being assignable going forward, but
-- what already happened stays intact and visible).
CREATE TYPE public.subject_type AS ENUM ('compulsory', 'elected');

CREATE TABLE public.subjects (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level  text NOT NULL,
  name         text NOT NULL,
  type         public.subject_type NOT NULL,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);

-- Partial unique index (not a table constraint) so a removed subject's name
-- can be reused for a fresh one in the same grade without fighting a
-- constraint that a plain UNIQUE(grade_level, name) would still enforce
-- against the soft-deleted row.
CREATE UNIQUE INDEX idx_subjects_grade_name_active
  ON public.subjects (grade_level, name)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_subjects_grade ON public.subjects(grade_level) WHERE deleted_at IS NULL;

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Only Super Admin adds/removes subjects.
CREATE POLICY "super_admin_manage_subjects"
  ON public.subjects FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Every staff role needs to read the subject list somewhere (Marks Admin
-- picking a subject for a new test, Attendance/Admissions seeing what a
-- class studies) — this is a reference list, not sensitive data, so a broad
-- authenticated-read policy is the right shape rather than enumerating every
-- role individually.
CREATE POLICY "staff_read_subjects"
  ON public.subjects FOR SELECT
  USING (public.current_role() IN ('super_admin', 'admissions_admin', 'attendance_admin', 'marks_admin'));

-- A parent needs subject names to make sense of their own children's marks
-- (joined via tests.subject_id, see the tests migration) — scoped to
-- subjects that belong to a grade one of their linked children is actually
-- in, not every subject in the school.
CREATE POLICY "parent_read_linked_children_subjects"
  ON public.subjects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    JOIN public.students s ON s.id = psl.student_id
    WHERE psl.parent_id = auth.uid() AND s.grade_level = subjects.grade_level
  ));
