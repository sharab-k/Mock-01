-- Rollback: supabase/rollbacks/20261110100000_inactive_students_out_of_totals_rollback.sql

-- A student set to Inactive is out of the daily work (attendance, marks entry, fee lists, vouchers) — and now also
-- out of the dashboard totals, so the numbers match the lists. Nothing is deleted: their records stay in the
-- tables and in the student's own history, and the totals include them again the moment they are set Active.
--
-- Same function names, arguments and result columns as before; only the rows counted change. Each function
-- still runs as the caller (SECURITY INVOKER), so row-level security still decides what is visible.
-- Money actually received (fee receipts, income) is left alone: it was received whatever the student's status.

-- ── Marks ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.marks_class_stats()
RETURNS TABLE (grade_level text, section text, entries bigint, graded bigint, avg_pct numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT s.grade_level::text, s.section::text, count(*), count(DISTINCT m.student_id),
         avg(m.score::numeric * 100 / NULLIF(m.max_score, 0))
  FROM public.marks m
  JOIN public.students s ON s.id = m.student_id
  WHERE s.status = 'active' AND s.deleted_at IS NULL
  GROUP BY s.grade_level, s.section
$$;

CREATE OR REPLACE FUNCTION public.marks_subject_stats()
RETURNS TABLE (subject text, entries bigint, avg_pct numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT m.subject, count(*), avg(m.score::numeric * 100 / NULLIF(m.max_score, 0))
  FROM public.marks m
  JOIN public.students s ON s.id = m.student_id
  WHERE s.status = 'active' AND s.deleted_at IS NULL
  GROUP BY m.subject
$$;

-- ── Attendance ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.attendance_day_stats(p_dates date[])
RETURNS TABLE (class_date date, present bigint, absent bigint, late bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT a.class_date,
         count(*) FILTER (WHERE a.status = 'present'),
         count(*) FILTER (WHERE a.status = 'absent'),
         count(*) FILTER (WHERE a.status = 'late')
  FROM public.attendance_records a
  JOIN public.students s ON s.id = a.student_id
  WHERE a.class_date = ANY (p_dates) AND s.status = 'active' AND s.deleted_at IS NULL
  GROUP BY a.class_date
$$;

CREATE OR REPLACE FUNCTION public.attendance_class_day(p_date date)
RETURNS TABLE (grade_level text, section text, status public.attendance_status, n bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT s.grade_level::text, s.section::text, a.status, count(*)
  FROM public.attendance_records a
  JOIN public.students s ON s.id = a.student_id
  WHERE a.class_date = p_date AND s.status = 'active' AND s.deleted_at IS NULL
  GROUP BY s.grade_level, s.section, a.status
$$;

-- Approved leave stays excused (left out of the total), as in 20261108100100.
CREATE OR REPLACE FUNCTION public.attendance_weekly_rates(p_today date)
RETURNS TABLE (bucket integer, attended bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT b.i,
         count(a.id) FILTER (WHERE a.status IN ('present', 'late')),
         count(a.id) FILTER (WHERE a.status <> 'leave')
  FROM generate_series(0, 3) AS b(i)
  LEFT JOIN public.attendance_records a
    ON a.class_date BETWEEN (p_today - ((3 - b.i) * 7) - 6) AND (p_today - ((3 - b.i) * 7))
   AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = a.student_id AND s.status = 'active' AND s.deleted_at IS NULL)
  GROUP BY b.i
  ORDER BY b.i
$$;

CREATE OR REPLACE FUNCTION public.attendance_grade_rates()
RETURNS TABLE (grade_level text, attended bigint, total bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT s.grade_level::text, count(*) FILTER (WHERE a.status IN ('present', 'late')), count(*) FILTER (WHERE a.status <> 'leave')
  FROM public.attendance_records a
  JOIN public.students s ON s.id = a.student_id
  WHERE s.status = 'active' AND s.deleted_at IS NULL
  GROUP BY s.grade_level
$$;

-- ── Fees: what is still owed counts only active students ─────────────────
-- (An inactive student's unpaid dues stay on their own ledger and come back into the total when they are
-- set Active again.)
CREATE OR REPLACE FUNCTION public.fee_overview(p_from date, p_to date)
RETURNS TABLE (collected numeric, receipt_count bigint, outstanding numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    COALESCE((SELECT sum(amount) FROM public.fee_receipts WHERE voided_at IS NULL AND paid_on BETWEEN p_from AND p_to), 0),
    (SELECT count(*) FROM public.fee_receipts WHERE voided_at IS NULL AND paid_on BETWEEN p_from AND p_to),
    COALESCE((SELECT sum(b.outstanding) FROM public.fee_charge_balances b
              JOIN public.students s ON s.id = b.student_id
              WHERE s.status = 'active' AND s.deleted_at IS NULL), 0);
$$;

CREATE OR REPLACE FUNCTION public.finance_totals(p_from date, p_to date)
RETURNS TABLE (income numeric, expenses numeric, net numeric, outstanding numeric, receipt_count bigint, expense_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH i AS (SELECT COALESCE(sum(amount), 0) AS v, count(*) AS n FROM public.fee_receipts WHERE voided_at IS NULL AND paid_on BETWEEN p_from AND p_to),
       e AS (SELECT COALESCE(sum(amount), 0) AS v, count(*) AS n FROM public.expenses WHERE voided_at IS NULL AND spent_on BETWEEN p_from AND p_to),
       o AS (SELECT COALESCE(sum(b.outstanding), 0) AS v FROM public.fee_charge_balances b
             JOIN public.students s ON s.id = b.student_id
             WHERE s.status = 'active' AND s.deleted_at IS NULL)
  SELECT i.v, e.v, i.v - e.v, o.v, i.n, e.n FROM i, e, o;
$$;
