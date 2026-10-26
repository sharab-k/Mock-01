-- Rollback: supabase/rollbacks/20261026120000_students_list_sort_rollback.sql

-- Every list of students must read grade by grade (9, 10, 11, 12, ICOM-1,
-- ICOM-2) and, inside a grade, by G.R. number ascending (FA544, FA545, FA546…).
-- G.R. numbers are free text with inconsistent spacing ("FA 545" / "FA546",
-- "N 101"), so all whitespace is removed and every digit run is zero-padded
-- (natural_sort_key). Students with no G.R. number go to the end of their grade,
-- ordered by roll number. list_sort is generated, so it can never drift, and
-- every list — web, mobile, any role — just does ORDER BY list_sort.
ALTER TABLE public.students
  ADD COLUMN list_sort text GENERATED ALWAYS AS (
    public.natural_sort_key(grade_level) || '~' ||
    CASE WHEN nullif(btrim(gr_number), '') IS NULL THEN '1' ELSE '0' END || '~' ||
    public.natural_sort_key(regexp_replace(COALESCE(gr_number, ''), '\s+', '', 'g')) || '~' ||
    public.natural_sort_key(roll_number)
  ) STORED;

CREATE INDEX idx_students_list_sort ON public.students(list_sort);
