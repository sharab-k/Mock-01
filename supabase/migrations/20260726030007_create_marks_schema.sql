-- Rollback: DROP TABLE IF EXISTS public.marks_edit_history;
--           DROP TABLE IF EXISTS public.marks; DROP TYPE IF EXISTS public.exam_type;

-- ── marks ────────────────────────────────────────────────────────────────────
-- `term` is a CLAUDE.md §5 baseline column, but the already-built Enter Marks
-- UI (MarksEnterContent) never collects a term — it only picks
-- grade/section/subject/exam type. Defaulting to the current calendar year
-- as a single free-text term identifier ("2026") until the client defines a
-- real term/semester structure — flagged here as provisional, same as the
-- tier-weight assumption below.
--
-- UNIQUE(student_id, subject, exam_type, term) makes bulk entry idempotent:
-- re-submitting the same class/subject/exam updates the existing row rather
-- than creating a duplicate, which is what lets the Server Action detect a
-- genuine score *change* and log it to marks_edit_history.
CREATE TYPE public.exam_type AS ENUM ('monthly', 'half_yearly', 'final');

CREATE TABLE public.marks (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject      text NOT NULL,
  exam_type    public.exam_type NOT NULL,
  score        integer NOT NULL,
  max_score    integer NOT NULL DEFAULT 100,
  term         text NOT NULL,
  recorded_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject, exam_type, term),
  CHECK (score >= 0 AND score <= max_score)
);

CREATE INDEX idx_marks_student ON public.marks(student_id);
CREATE INDEX idx_marks_subject ON public.marks(subject);

CREATE TRIGGER trg_marks_updated_at
  BEFORE UPDATE ON public.marks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marks_full_access"
  ON public.marks FOR ALL
  USING (public.current_role() IN ('marks_admin', 'super_admin'))
  WITH CHECK (public.current_role() IN ('marks_admin', 'super_admin'));

-- No separate student login exists (CLAUDE.md §4) — a parent's own session
-- covers both the multi-sibling view and any single-child drill-down.
CREATE POLICY "parent_read_linked_children_marks"
  ON public.marks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = marks.student_id AND psl.parent_id = auth.uid()
  ));

-- ── marks_edit_history ──────────────────────────────────────────────────────
-- CLAUDE.md §4: marks_admin edits are "logged, never silently overwritten."
-- Deliberately no UPDATE/DELETE policy at all, for any role — RLS denies by
-- default when no policy grants an operation, so this table is genuinely
-- append-only at the database level, not just by application convention.
CREATE TABLE public.marks_edit_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id        uuid NOT NULL REFERENCES public.marks(id) ON DELETE CASCADE,
  previous_score integer NOT NULL,
  new_score      integer NOT NULL,
  edited_by      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  edited_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marks_edit_history_mark ON public.marks_edit_history(mark_id);

ALTER TABLE public.marks_edit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "marks_staff_read"
  ON public.marks_edit_history FOR SELECT
  USING (public.current_role() IN ('marks_admin', 'super_admin'));

CREATE POLICY "marks_staff_insert"
  ON public.marks_edit_history FOR INSERT
  WITH CHECK (public.current_role() IN ('marks_admin', 'super_admin'));
