-- Rollback:
--   DROP TRIGGER IF EXISTS trg_students_set_enrollment_identifiers ON public.students;
--   DROP FUNCTION IF EXISTS public.set_student_enrollment_identifiers();
--   DROP FUNCTION IF EXISTS public.allocate_roll_number(text, text, int);
--   DROP TABLE IF EXISTS public.roll_number_counters;
--   ALTER SEQUENCE public.registration_number_seq RENAME TO roll_number_seq;
--   ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_roll_scope_key;
--   ALTER TABLE public.students ADD CONSTRAINT students_roll_number_key UNIQUE (roll_number);
--   ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_registration_number_key;
--   ALTER TABLE public.students DROP COLUMN registration_number, DROP COLUMN academic_year;
--   (then recreate enrol_student() from 20260805211200_fix_enrol_student_roll_number.sql)

-- roll_number was globally unique forever (JE-{year}-{seq}). The client wants
-- roll numbers to be able to repeat across academic sessions (e.g. roll "1"
-- reissued to a different student next year in the same class), while a
-- separate, permanent, never-reused registration_number stays on the record
-- for admins to look a student up by regardless of session. See CLAUDE.md §5.

ALTER TABLE public.students
  ADD COLUMN academic_year      int,
  ADD COLUMN registration_number text;

-- ── roll_number_counters ────────────────────────────────────────────────────
-- Atomic per-(grade, section, year) sequence. Pure internal bookkeeping —
-- never queried directly by any client, so RLS is enabled with zero policies
-- (deny-all from the app layer); only the SECURITY DEFINER helper below
-- touches it. The authorization question ("can this caller insert a
-- student?") is still fully answered by students' own RLS, unchanged.
CREATE TABLE public.roll_number_counters (
  grade_level   text NOT NULL,
  section       text NOT NULL,
  academic_year int  NOT NULL,
  next_number   int  NOT NULL DEFAULT 1,
  PRIMARY KEY (grade_level, section, academic_year)
);

ALTER TABLE public.roll_number_counters ENABLE ROW LEVEL SECURITY;

-- ── allocate_roll_number ────────────────────────────────────────────────────
-- SECURITY DEFINER (owned by the migration role, which bypasses RLS by
-- default) so it can write to the policy-less counter table above even
-- though the trigger that calls it runs as SECURITY INVOKER.
CREATE FUNCTION public.allocate_roll_number(p_grade text, p_section text, p_year int)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_seq int;
BEGIN
  INSERT INTO public.roll_number_counters (grade_level, section, academic_year, next_number)
  VALUES (p_grade, p_section, p_year, 2)
  ON CONFLICT (grade_level, section, academic_year)
  DO UPDATE SET next_number = public.roll_number_counters.next_number + 1
  RETURNING next_number - 1 INTO v_seq;
  RETURN v_seq;
END;
$$;

-- ── set_student_enrollment_identifiers ─────────────────────────────────────
-- Plain SECURITY INVOKER (default, no clause) — this can never be used to
-- bypass students' own RLS. Only fills columns left NULL by the caller, so
-- explicit-value inserts (e.g. the RLS integration tests, which pass their
-- own roll_number) are left untouched.
CREATE FUNCTION public.set_student_enrollment_identifiers()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.academic_year IS NULL THEN
    NEW.academic_year := extract(year from COALESCE(NEW.enrollment_date, current_date))::int;
  END IF;

  IF NEW.roll_number IS NULL THEN
    NEW.roll_number := NEW.grade_level || NEW.section ||
      public.allocate_roll_number(NEW.grade_level, NEW.section, NEW.academic_year)::text;
  END IF;

  IF NEW.registration_number IS NULL THEN
    NEW.registration_number := 'JE-' || extract(year from now())::int || '-' ||
      lpad(nextval('public.registration_number_seq')::text, 3, '0');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_students_set_enrollment_identifiers
  BEFORE INSERT ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_student_enrollment_identifiers();

-- ── registration_number_seq ─────────────────────────────────────────────────
-- Rename (not recreate) so the sequence's current value carries forward —
-- already-issued roll numbers (which become the backfilled
-- registration_number below) can never collide with a freshly-generated one.
ALTER SEQUENCE public.roll_number_seq RENAME TO registration_number_seq;

-- ── Backfill existing rows ──────────────────────────────────────────────────
-- Existing students' current globally-unique roll numbers become their
-- permanent registration numbers. roll_number itself is left as-is — not
-- retroactively reformatted into the new grade+section+seq shape, since that
-- could invalidate already-issued/printed roll numbers.
UPDATE public.students
SET registration_number = roll_number,
    academic_year = extract(year from enrollment_date)::int
WHERE registration_number IS NULL;

ALTER TABLE public.students
  ALTER COLUMN registration_number SET NOT NULL,
  ALTER COLUMN academic_year SET NOT NULL,
  ADD CONSTRAINT students_registration_number_key UNIQUE (registration_number);

-- Drop the old global unique constraint on roll_number via introspection
-- (not a hardcoded name) — matches this file's own established pattern for
-- functions (see the pg_proc loop below) applied here to pg_constraint.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public' AND rel.relname = 'students' AND con.contype = 'u'
      AND con.conkey = (
        SELECT array_agg(attnum ORDER BY attnum)
        FROM pg_attribute
        WHERE attrelid = rel.oid AND attname = 'roll_number'
      )
  LOOP
    EXECUTE format('ALTER TABLE public.students DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE public.students
  ADD CONSTRAINT students_roll_scope_key UNIQUE (grade_level, section, academic_year, roll_number);

-- ── Simplify enrol_student() ────────────────────────────────────────────────
-- No longer computes roll_number/registration_number/academic_year itself —
-- the trigger above fills them in. No parameter signature change, same
-- callers/args, unchanged GRANT.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'enrol_student'
  LOOP
    EXECUTE format('DROP FUNCTION %s', r.sig);
  END LOOP;
END $$;

CREATE FUNCTION public.enrol_student(
  p_full_name text,
  p_program text,
  p_grade_level text,
  p_section text,
  p_is_late_enrollment boolean,
  p_parent_id uuid,
  p_guardian_profession text DEFAULT NULL,
  p_previous_school text DEFAULT NULL,
  p_last_qualification text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_gr_number text DEFAULT NULL,
  p_registration_fee numeric DEFAULT NULL,
  p_tuition_fee numeric DEFAULT NULL,
  p_stream text DEFAULT NULL
) RETURNS public.students
LANGUAGE plpgsql AS $$
DECLARE
  v_student public.students;
BEGIN
  INSERT INTO public.students (
    full_name, program, grade_level, section, is_late_enrollment,
    guardian_profession, previous_school, last_qualification, address,
    gr_number, registration_fee, tuition_fee, stream
  )
  VALUES (
    p_full_name, p_program, p_grade_level, p_section, p_is_late_enrollment,
    p_guardian_profession, p_previous_school, p_last_qualification, p_address,
    p_gr_number, p_registration_fee, p_tuition_fee, p_stream
  )
  RETURNING * INTO v_student;

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (p_parent_id, v_student.id);

  RETURN v_student;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enrol_student TO authenticated;
