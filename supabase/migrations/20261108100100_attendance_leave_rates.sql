-- Rollback: supabase/rollbacks/20261108100000_attendance_leave_rollback.sql

-- Leave is excused: it is recorded and shown, but it is not "a day the student could have
-- attended", so it is left out of every attendance total (and therefore every rate).
-- Same signatures as before, so callers are unchanged; day and class-day counts ignore leave rows.

CREATE OR REPLACE FUNCTION public.attendance_student_stats()
RETURNS TABLE (student_id uuid, present bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT a.student_id, count(*) FILTER (WHERE a.status IN ('present', 'late')), count(*) FILTER (WHERE a.status <> 'leave')
  FROM public.attendance_records a
  GROUP BY a.student_id
$$;

CREATE OR REPLACE FUNCTION public.attendance_weekly_rates(p_today date)
RETURNS TABLE (bucket integer, attended bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT b.i,
         count(a.id) FILTER (WHERE a.status IN ('present', 'late')),
         count(a.id) FILTER (WHERE a.status <> 'leave')
  FROM generate_series(0, 3) AS b(i)
  LEFT JOIN public.attendance_records a
    ON a.class_date BETWEEN (p_today - ((3 - b.i) * 7) - 6) AND (p_today - ((3 - b.i) * 7))
  GROUP BY b.i
  ORDER BY b.i
$$;

CREATE OR REPLACE FUNCTION public.attendance_grade_rates()
RETURNS TABLE (grade_level text, attended bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT s.grade_level::text, count(*) FILTER (WHERE a.status IN ('present', 'late')), count(*) FILTER (WHERE a.status <> 'leave')
  FROM public.attendance_records a
  JOIN public.students s ON s.id = a.student_id
  GROUP BY s.grade_level
$$;

CREATE OR REPLACE FUNCTION public.attendance_class_term(p_grade text, p_section text)
RETURNS TABLE (student_id uuid, present bigint, absent bigint, late bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT a.student_id,
         count(*) FILTER (WHERE a.status = 'present'),
         count(*) FILTER (WHERE a.status = 'absent'),
         count(*) FILTER (WHERE a.status = 'late'),
         count(*) FILTER (WHERE a.status <> 'leave')
  FROM public.attendance_records a
  JOIN public.students s ON s.id = a.student_id
  WHERE s.grade_level = p_grade AND s.section = p_section AND s.deleted_at IS NULL AND s.status = 'active'
  GROUP BY a.student_id
$$;
