-- Rollback:
--   DROP INDEX IF EXISTS public.marks_student_subject_exam_term_date_key;
--   CREATE UNIQUE INDEX marks_student_subject_exam_term_key
--     ON public.marks (student_id, subject, exam_type, term) WHERE test_id IS NULL;
--   ALTER TABLE public.marks DROP COLUMN IF EXISTS exam_date;
--   (rollback of the unique index fails if the same exam was since recorded on two dates)

-- Every mark now carries the date its exam was held. Class tests already have
-- one (tests.test_date); the fixed Monthly / Half-Yearly / Final exams only had
-- the day the row happened to be typed in, which is wrong for back-dated entry
-- and for spreadsheet uploads of past results.
ALTER TABLE public.marks ADD COLUMN exam_date date;

UPDATE public.marks m
SET exam_date = COALESCE(
  (SELECT t.test_date FROM public.tests t WHERE t.id = m.test_id),
  (m.created_at AT TIME ZONE 'Asia/Karachi')::date
);

ALTER TABLE public.marks
  ALTER COLUMN exam_date SET NOT NULL,
  ALTER COLUMN exam_date SET DEFAULT CURRENT_DATE;

-- A fixed-type exam is now identified by its date too, so a school that runs a
-- Monthly test every month can record September's and October's side by side
-- instead of the second silently replacing the first. Re-uploading the same
-- exam (same date) still updates in place.
DROP INDEX IF EXISTS public.marks_student_subject_exam_term_key;

CREATE UNIQUE INDEX marks_student_subject_exam_term_date_key
  ON public.marks (student_id, subject, exam_type, term, exam_date)
  WHERE test_id IS NULL;

CREATE INDEX idx_marks_student_exam_date ON public.marks (student_id, exam_date DESC);
