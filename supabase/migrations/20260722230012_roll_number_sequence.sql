-- Rollback: DROP FUNCTION IF EXISTS public.enrol_student(text,text,text,text,boolean,uuid);
--           DROP SEQUENCE IF EXISTS public.roll_number_seq;
--           (previous enrol_student(text,text,text,text,text,boolean,uuid) signature is gone —
--            restore it from 20260722225636_create_admissions_schema.sql if truly needed)

-- Moves roll_number generation inside the RPC (JE-{year}-{seq}, global
-- sequence — not reset per year, a deliberate simplification) so it's
-- generated atomically with the insert instead of guessed randomly by the
-- caller and retried on collision.
DROP FUNCTION IF EXISTS public.enrol_student(text, text, text, text, text, boolean, uuid);

CREATE SEQUENCE public.roll_number_seq START 1;

CREATE FUNCTION public.enrol_student(
  p_full_name text,
  p_program text,
  p_grade_level text,
  p_section text,
  p_is_late_enrollment boolean,
  p_parent_id uuid
) RETURNS public.students
LANGUAGE plpgsql AS $$
DECLARE
  v_student public.students;
  v_roll text;
BEGIN
  v_roll := 'JE-' || extract(year from now())::int || '-' || lpad(nextval('public.roll_number_seq')::text, 3, '0');

  INSERT INTO public.students (roll_number, full_name, program, grade_level, section, is_late_enrollment)
  VALUES (v_roll, p_full_name, p_program, p_grade_level, p_section, p_is_late_enrollment)
  RETURNING * INTO v_student;

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (p_parent_id, v_student.id);

  RETURN v_student;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enrol_student(text, text, text, text, boolean, uuid) TO authenticated;
