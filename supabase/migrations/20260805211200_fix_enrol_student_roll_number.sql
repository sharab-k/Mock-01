-- Rollback: re-run 20260805210700_expand_student_admission_fields.sql's
--   function body (the buggy version this migration corrects).

-- 20260805210700 recreated enrol_student from a stale copy of the original
-- 7-arg version (create_admissions_schema.sql), which still took an explicit
-- p_roll_number. That parameter was actually removed by
-- 20260722230012_roll_number_sequence.sql, which moved roll-number
-- generation inside the function via roll_number_seq — so the version just
-- pushed silently regressed live enrolment to require a roll number no
-- caller ever supplies. This restores the sequence-based generation while
-- keeping the new optional admission-form fields.
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
  v_roll text;
BEGIN
  v_roll := 'JE-' || extract(year from now())::int || '-' || lpad(nextval('public.roll_number_seq')::text, 3, '0');

  INSERT INTO public.students (
    roll_number, full_name, program, grade_level, section, is_late_enrollment,
    guardian_profession, previous_school, last_qualification, address,
    gr_number, registration_fee, tuition_fee, stream
  )
  VALUES (
    v_roll, p_full_name, p_program, p_grade_level, p_section, p_is_late_enrollment,
    p_guardian_profession, p_previous_school, p_last_qualification, p_address,
    p_gr_number, p_registration_fee, p_tuition_fee, p_stream
  )
  RETURNING * INTO v_student;

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (p_parent_id, v_student.id);

  RETURN v_student;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enrol_student(text, text, text, text, boolean, uuid, text, text, text, text, text, numeric, numeric, text) TO authenticated;
