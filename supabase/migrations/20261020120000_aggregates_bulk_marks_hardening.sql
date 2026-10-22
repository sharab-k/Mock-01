-- Rollback:
--   DROP FUNCTION IF EXISTS public.marks_class_stats(), public.marks_student_averages(), public.marks_subject_stats(),
--     public.marks_existing(text, text, text, public.exam_type, date), public.tests_mark_counts(),
--     public.attendance_student_stats(), public.attendance_weekly_rates(date), public.attendance_grade_rates(),
--     public.attendance_day_stats(date[]), public.attendance_class_day(date), public.attendance_class_term(text, text),
--     public.bulk_upsert_marks(jsonb);
--   (privilege and search_path changes: re-GRANT EXECUTE to anon/authenticated and RESET search_path as needed;
--    the student-name trim is not reversible and only removes trailing/leading blanks.)

-- ============================================================================
-- 1. Aggregates computed by the database
-- ----------------------------------------------------------------------------
-- The dashboards used to download whole tables (every mark, every attendance
-- row) and add them up in JavaScript. PostgREST silently returns at most 1,000
-- rows per request, so those numbers went wrong as soon as a table grew past
-- that — and they were slow long before. Each function below returns the
-- already-added-up answer in a handful of rows.
--
-- All are SECURITY INVOKER: they run as the caller, so row-level security
-- decides what is counted, exactly as it did for the old table reads.
-- ============================================================================

-- Marks per class: entries, how many students have at least one mark, average %.
CREATE OR REPLACE FUNCTION public.marks_class_stats()
RETURNS TABLE (grade_level text, section text, entries bigint, graded bigint, avg_pct numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT s.grade_level::text, s.section::text, count(*), count(DISTINCT m.student_id),
         avg(m.score::numeric * 100 / NULLIF(m.max_score, 0))
  FROM public.marks m
  JOIN public.students s ON s.id = m.student_id
  GROUP BY s.grade_level, s.section
$$;

-- Each student's overall average % (every mark, any subject/exam) and mark count.
CREATE OR REPLACE FUNCTION public.marks_student_averages()
RETURNS TABLE (student_id uuid, avg_pct numeric, entry_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.student_id, avg(m.score::numeric * 100 / NULLIF(m.max_score, 0)), count(*)
  FROM public.marks m
  GROUP BY m.student_id
$$;

-- Per-subject entries and average %.
CREATE OR REPLACE FUNCTION public.marks_subject_stats()
RETURNS TABLE (subject text, entries bigint, avg_pct numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.subject, count(*), avg(m.score::numeric * 100 / NULLIF(m.max_score, 0))
  FROM public.marks m
  GROUP BY m.subject
$$;

-- The marks already saved for one class/subject/exam/date (pre-fills the entry
-- screen) — instead of downloading every mark in the school up front.
CREATE OR REPLACE FUNCTION public.marks_existing(
  p_grade text, p_section text, p_subject text, p_exam_type public.exam_type, p_date date
)
RETURNS TABLE (student_id uuid, score integer, max_score integer)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.student_id, m.score, m.max_score
  FROM public.marks m
  JOIN public.students s ON s.id = m.student_id
  WHERE s.grade_level = p_grade AND s.section = p_section AND s.deleted_at IS NULL
    AND m.subject = p_subject AND m.exam_type = p_exam_type AND m.exam_date = p_date
    AND m.test_id IS NULL
$$;

-- How many marks each class test has.
CREATE OR REPLACE FUNCTION public.tests_mark_counts()
RETURNS TABLE (test_id uuid, entries bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.test_id, count(*) FROM public.marks m WHERE m.test_id IS NOT NULL GROUP BY m.test_id
$$;

-- Attended (present or late) vs total days per student, all time.
CREATE OR REPLACE FUNCTION public.attendance_student_stats()
RETURNS TABLE (student_id uuid, present bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT a.student_id, count(*) FILTER (WHERE a.status IN ('present', 'late')), count(*)
  FROM public.attendance_records a
  GROUP BY a.student_id
$$;

-- Four rolling 7-day buckets ending on p_today (bucket 0 = oldest).
CREATE OR REPLACE FUNCTION public.attendance_weekly_rates(p_today date)
RETURNS TABLE (bucket integer, attended bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT b.i,
         count(a.id) FILTER (WHERE a.status IN ('present', 'late')),
         count(a.id)
  FROM generate_series(0, 3) AS b(i)
  LEFT JOIN public.attendance_records a
    ON a.class_date BETWEEN (p_today - ((3 - b.i) * 7) - 6) AND (p_today - ((3 - b.i) * 7))
  GROUP BY b.i
  ORDER BY b.i
$$;

-- Attended vs total per grade, all time.
CREATE OR REPLACE FUNCTION public.attendance_grade_rates()
RETURNS TABLE (grade_level text, attended bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT s.grade_level::text, count(*) FILTER (WHERE a.status IN ('present', 'late')), count(*)
  FROM public.attendance_records a
  JOIN public.students s ON s.id = a.student_id
  GROUP BY s.grade_level
$$;

-- Present / absent / late counts for each of the given dates.
CREATE OR REPLACE FUNCTION public.attendance_day_stats(p_dates date[])
RETURNS TABLE (class_date date, present bigint, absent bigint, late bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT a.class_date,
         count(*) FILTER (WHERE a.status = 'present'),
         count(*) FILTER (WHERE a.status = 'absent'),
         count(*) FILTER (WHERE a.status = 'late')
  FROM public.attendance_records a
  WHERE a.class_date = ANY (p_dates)
  GROUP BY a.class_date
$$;

-- One day's status counts per class.
CREATE OR REPLACE FUNCTION public.attendance_class_day(p_date date)
RETURNS TABLE (grade_level text, section text, status public.attendance_status, n bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT s.grade_level::text, s.section::text, a.status, count(*)
  FROM public.attendance_records a
  JOIN public.students s ON s.id = a.student_id
  WHERE a.class_date = p_date
  GROUP BY s.grade_level, s.section, a.status
$$;

-- All-time present/absent/late per student for one class (the roster's term figures).
CREATE OR REPLACE FUNCTION public.attendance_class_term(p_grade text, p_section text)
RETURNS TABLE (student_id uuid, present bigint, absent bigint, late bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT a.student_id,
         count(*) FILTER (WHERE a.status = 'present'),
         count(*) FILTER (WHERE a.status = 'absent'),
         count(*) FILTER (WHERE a.status = 'late'),
         count(*)
  FROM public.attendance_records a
  JOIN public.students s ON s.id = a.student_id
  WHERE s.grade_level = p_grade AND s.section = p_section AND s.deleted_at IS NULL AND s.status = 'active'
  GROUP BY a.student_id
$$;

GRANT EXECUTE ON FUNCTION
  public.marks_class_stats(), public.marks_student_averages(), public.marks_subject_stats(),
  public.marks_existing(text, text, text, public.exam_type, date), public.tests_mark_counts(),
  public.attendance_student_stats(), public.attendance_weekly_rates(date), public.attendance_grade_rates(),
  public.attendance_day_stats(date[]), public.attendance_class_day(date), public.attendance_class_term(text, text)
TO authenticated;
REVOKE EXECUTE ON FUNCTION
  public.marks_class_stats(), public.marks_student_averages(), public.marks_subject_stats(),
  public.marks_existing(text, text, text, public.exam_type, date), public.tests_mark_counts(),
  public.attendance_student_stats(), public.attendance_weekly_rates(date), public.attendance_grade_rates(),
  public.attendance_day_stats(date[]), public.attendance_class_day(date), public.attendance_class_term(text, text)
FROM PUBLIC, anon;

-- ============================================================================
-- 2. Bulk marks save in ONE database call
-- ----------------------------------------------------------------------------
-- A spreadsheet upload used to make ~5 round trips per (subject, total, date)
-- group — about 2 s per group on the live site, so a real results file needed
-- minutes and could be cut off half-saved. This does the whole batch in one
-- statement: insert new marks, update changed ones, and write the edit-history
-- row for every changed score (CLAUDE.md §4: never a silent overwrite).
--
-- SECURITY INVOKER: marks/marks_edit_history policies apply to the caller as
-- usual. The caller must not send the same (student, subject, exam, term, date)
-- twice in one batch.
-- Returns the counts and the rows that are new or whose score changed (what the
-- parent notices are for).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.bulk_upsert_marks(p_rows jsonb)
RETURNS TABLE (inserted integer, updated integer, changed jsonb)
LANGUAGE sql SET search_path = public AS $$
  WITH incoming AS (
    SELECT (r->>'student_id')::uuid        AS student_id,
           r->>'subject'                   AS subject,
           (r->>'exam_type')::public.exam_type AS exam_type,
           r->>'term'                      AS term,
           (r->>'exam_date')::date         AS exam_date,
           (r->>'score')::integer          AS score,
           (r->>'max_score')::integer      AS max_score
    FROM jsonb_array_elements(p_rows) AS r
  ),
  before AS (
    SELECT m.id, m.score
    FROM public.marks m
    JOIN incoming i
      ON i.student_id = m.student_id AND i.subject = m.subject AND i.exam_type = m.exam_type
     AND i.term = m.term AND i.exam_date = m.exam_date
    WHERE m.test_id IS NULL
  ),
  upserted AS (
    INSERT INTO public.marks (student_id, subject, exam_type, term, exam_date, score, max_score, recorded_by)
    SELECT student_id, subject, exam_type, term, exam_date, score, max_score, auth.uid() FROM incoming
    ON CONFLICT (student_id, subject, exam_type, term, exam_date) WHERE test_id IS NULL
    DO UPDATE SET score = EXCLUDED.score, max_score = EXCLUDED.max_score, recorded_by = EXCLUDED.recorded_by
      WHERE public.marks.score IS DISTINCT FROM EXCLUDED.score
         OR public.marks.max_score IS DISTINCT FROM EXCLUDED.max_score
    RETURNING id, student_id, subject, score, max_score, (xmax = 0) AS was_inserted
  ),
  history AS (
    INSERT INTO public.marks_edit_history (mark_id, previous_score, new_score, edited_by)
    SELECT u.id, b.score, u.score, auth.uid()
    FROM upserted u
    JOIN before b ON b.id = u.id
    WHERE NOT u.was_inserted AND b.score IS DISTINCT FROM u.score
    RETURNING 1
  )
  SELECT
    (count(*) FILTER (WHERE u.was_inserted))::integer,
    (count(*) FILTER (WHERE NOT u.was_inserted))::integer,
    COALESCE(
      jsonb_agg(jsonb_build_object('student_id', u.student_id, 'subject', u.subject, 'score', u.score, 'max_score', u.max_score))
        FILTER (WHERE u.was_inserted OR b.score IS DISTINCT FROM u.score),
      '[]'::jsonb
    )
  FROM upserted u
  LEFT JOIN before b ON b.id = u.id
$$;

GRANT EXECUTE ON FUNCTION public.bulk_upsert_marks(jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.bulk_upsert_marks(jsonb) FROM PUBLIC, anon;

-- ============================================================================
-- 3. Security hardening (Supabase security advisor)
-- ----------------------------------------------------------------------------
-- * Pin the search_path of every function that left it mutable.
-- * Trigger/event-trigger functions are never meant to be called as RPCs:
--   remove EXECUTE from everyone (triggers fire without it).
-- * allocate_roll_number is only ever called by the enrolment trigger, running
--   as the signed-in admissions user — keep it for authenticated, drop anon.
-- (current_role() stays callable: row-level-security policies evaluate it for
--  whichever role is reading, and it only ever reveals the caller's own role.)
-- ============================================================================
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.natural_sort_key(text) SET search_path = public;
ALTER FUNCTION public.set_student_enrollment_identifiers() SET search_path = public;
ALTER FUNCTION public.allocate_roll_number(text, text, integer) SET search_path = public;
ALTER FUNCTION public.enrol_student(text, text, text, text, boolean, uuid, text, text, text, text, text, numeric, numeric, text) SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.notify_parents_on_absence() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.allocate_roll_number(text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.allocate_roll_number(text, text, integer) TO authenticated;

-- ============================================================================
-- 4. Data hygiene
-- ----------------------------------------------------------------------------
-- 473 student names carry a stray leading/trailing blank (every screen had to
-- .trim() them). Clean the source.
-- ============================================================================
UPDATE public.students SET full_name = btrim(full_name) WHERE full_name <> btrim(full_name);
