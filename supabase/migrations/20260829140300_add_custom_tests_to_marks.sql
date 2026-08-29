-- Rollback:
--   ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_student_test_key;
--   ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_student_subject_exam_term_key;
--   ALTER TABLE public.marks ADD CONSTRAINT marks_student_id_subject_exam_type_term_key UNIQUE (student_id, subject, exam_type, term);
--   ALTER TABLE public.marks DROP COLUMN IF EXISTS test_id;
--   (exam_type's added 'custom' enum value cannot be cleanly dropped — see note below)

-- Widens `marks` to also hold entries against a Marks-Admin-created custom
-- test (public.tests), additive alongside the existing fixed exam_type
-- entries — confirmed: Monthly/Half-Yearly/Final keep working exactly as
-- they do today, unchanged.
--
-- New enum value first, in its own statement — Postgres won't let a value
-- just added by ALTER TYPE be referenced later in the same transaction on
-- some versions, so it's kept isolated from the rest of this migration's
-- DDL to be safe either way.
ALTER TYPE public.exam_type ADD VALUE IF NOT EXISTS 'custom';
