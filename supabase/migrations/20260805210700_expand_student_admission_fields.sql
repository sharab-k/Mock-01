-- Rollback:
--   DROP FUNCTION IF EXISTS public.enrol_student(text, text, text, text, text, boolean, uuid, text, text, text, text, text, numeric, numeric, text);
--   CREATE FUNCTION public.enrol_student(p_roll_number text, p_full_name text, p_program text, p_grade_level text, p_section text, p_is_late_enrollment boolean, p_parent_id uuid) RETURNS public.students LANGUAGE plpgsql AS $$ DECLARE v_student public.students; BEGIN INSERT INTO public.students (roll_number, full_name, program, grade_level, section, is_late_enrollment) VALUES (p_roll_number, p_full_name, p_program, p_grade_level, p_section, p_is_late_enrollment) RETURNING * INTO v_student; INSERT INTO public.parent_student_links (parent_id, student_id) VALUES (p_parent_id, v_student.id); RETURN v_student; END; $$;
--   GRANT EXECUTE ON FUNCTION public.enrol_student TO authenticated;
--   ALTER TABLE public.students DROP COLUMN guardian_profession, DROP COLUMN previous_school, DROP COLUMN last_qualification, DROP COLUMN address, DROP COLUMN gr_number, DROP COLUMN registration_fee, DROP COLUMN tuition_fee, DROP COLUMN stream;

-- Client's real paper admission form collects more than the digital form did.
-- All new fields are nullable/optional — this is additive, existing enrolled
-- students just have them unset. `stream` is the Intermediate-level subject
-- group (Pre-Engineering / Pre-Medical / Computer Science / Commerce) from
-- the paper form's checkboxes — kept separate from `program` (which still
-- drives the existing Primary Years/Middle School/Matriculation/Intermediate
-- level shown across every dashboard) since it's a finer-grained field only
-- meaningful for grades 11-12, not a replacement for it.
ALTER TABLE public.students
  ADD COLUMN guardian_profession text,
  ADD COLUMN previous_school     text,
  ADD COLUMN last_qualification text,
  ADD COLUMN address             text,
  ADD COLUMN gr_number           text,
  ADD COLUMN registration_fee    numeric(10,2),
  ADD COLUMN tuition_fee         numeric(10,2),
  ADD COLUMN stream              text;

-- Dropped and recreated rather than CREATE OR REPLACE — adding parameters
-- (even with defaults) changes the call signature, and CREATE OR REPLACE
-- would silently leave the old 7-arg version as a separate overload instead
-- of truly replacing it. Dropped by introspecting pg_proc rather than a
-- literal signature list — a plain DROP FUNCTION ... (text, text, ...) can
-- fail to match (leaving a stale overload that later breaks the unqualified
-- GRANT below with "not unique") if the recorded signature differs in any
-- subtle way from what's written here.
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
  p_roll_number text,
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
    roll_number, full_name, program, grade_level, section, is_late_enrollment,
    guardian_profession, previous_school, last_qualification, address,
    gr_number, registration_fee, tuition_fee, stream
  )
  VALUES (
    p_roll_number, p_full_name, p_program, p_grade_level, p_section, p_is_late_enrollment,
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
