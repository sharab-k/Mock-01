-- Rollback:
--   ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_student_test_key;
--   ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_student_subject_exam_term_key;
--   ALTER TABLE public.marks ADD CONSTRAINT marks_student_id_subject_exam_type_term_key UNIQUE (student_id, subject, exam_type, term);
--   ALTER TABLE public.marks DROP COLUMN IF EXISTS test_id;

-- Continuation of the previous migration (kept the new 'custom' enum value
-- in its own transaction) — adds the actual link to public.tests and
-- re-scopes the idempotency constraint bulkSaveMarksAction relies on.
--
-- The old UNIQUE(student_id, subject, exam_type, term) assumed exam_type
-- alone identified "which exam" — true for the fixed three, but every
-- custom test row would have exam_type = 'custom', so that same constraint
-- would collide across genuinely different tests of the same subject/term.
-- Split into two partial unique indexes instead: the original rule still
-- applies to fixed-type rows, and test rows are keyed by test_id instead.
ALTER TABLE public.marks ADD COLUMN test_id uuid REFERENCES public.tests(id) ON DELETE CASCADE;

CREATE INDEX idx_marks_test ON public.marks(test_id) WHERE test_id IS NOT NULL;

ALTER TABLE public.marks DROP CONSTRAINT marks_student_id_subject_exam_type_term_key;

CREATE UNIQUE INDEX marks_student_subject_exam_term_key
  ON public.marks (student_id, subject, exam_type, term)
  WHERE test_id IS NULL;

CREATE UNIQUE INDEX marks_student_test_key
  ON public.marks (student_id, test_id)
  WHERE test_id IS NOT NULL;
