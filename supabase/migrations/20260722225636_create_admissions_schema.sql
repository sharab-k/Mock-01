-- Rollback: DROP FUNCTION IF EXISTS public.enrol_student;
--           DROP TABLE IF EXISTS public.admission_enquiries; DROP TYPE IF EXISTS public.enquiry_status;
--           DROP TABLE IF EXISTS public.parent_student_links;
--           DROP TABLE IF EXISTS public.students; DROP TYPE IF EXISTS public.student_status;

-- ── students ────────────────────────────────────────────────────────────────
-- `section` added beyond CLAUDE.md §5's baseline list — every dashboard
-- already filters by grade+section, the app can't function without it.
CREATE TYPE public.student_status AS ENUM ('active', 'inactive');

CREATE TABLE public.students (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number         text NOT NULL UNIQUE,
  full_name           text NOT NULL,
  program             text NOT NULL,
  grade_level         text NOT NULL,
  section             text NOT NULL,
  enrollment_date     date NOT NULL DEFAULT current_date,
  is_late_enrollment  boolean NOT NULL DEFAULT false,
  status              public.student_status NOT NULL DEFAULT 'active',
  deleted_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_grade_section ON public.students(grade_level, section) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── parent_student_links ───────────────────────────────────────────────────
-- Many-to-many on purpose (composite PK, no synthetic id) — CLAUDE.md §7
-- explicitly warns against narrowing this to one-to-many.
CREATE TABLE public.parent_student_links (
  parent_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);

CREATE INDEX idx_parent_student_links_student ON public.parent_student_links(student_id);

-- ── RLS: students ───────────────────────────────────────────────────────────
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admissions_full_access"
  ON public.students FOR ALL
  USING (public.current_role() IN ('admissions_admin', 'super_admin'))
  WITH CHECK (public.current_role() IN ('admissions_admin', 'super_admin'));

CREATE POLICY "staff_read_access"
  ON public.students FOR SELECT
  USING (public.current_role() IN ('attendance_admin', 'marks_admin'));

CREATE POLICY "parent_read_linked_children"
  ON public.students FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = students.id AND psl.parent_id = auth.uid()
  ));

-- ── RLS: parent_student_links ──────────────────────────────────────────────
ALTER TABLE public.parent_student_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admissions_full_access"
  ON public.parent_student_links FOR ALL
  USING (public.current_role() IN ('admissions_admin', 'super_admin'))
  WITH CHECK (public.current_role() IN ('admissions_admin', 'super_admin'));

CREATE POLICY "parent_read_own_links"
  ON public.parent_student_links FOR SELECT
  USING (parent_id = auth.uid());

-- ── Atomic student + link insert ───────────────────────────────────────────
-- SECURITY INVOKER (default, no clause) — the RLS policies above are what
-- actually authorize this, not a duplicated app-level role check.
CREATE OR REPLACE FUNCTION public.enrol_student(
  p_roll_number text,
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
BEGIN
  INSERT INTO public.students (roll_number, full_name, program, grade_level, section, is_late_enrollment)
  VALUES (p_roll_number, p_full_name, p_program, p_grade_level, p_section, p_is_late_enrollment)
  RETURNING * INTO v_student;

  INSERT INTO public.parent_student_links (parent_id, student_id)
  VALUES (p_parent_id, v_student.id);

  RETURN v_student;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enrol_student TO authenticated;

-- ── admission_enquiries ─────────────────────────────────────────────────────
-- Columns match the already-built UI (lib/mock/enquiries.ts) — parent_name +
-- grade_interest, not CLAUDE.md §5's literal student_name baseline, which
-- predates that screen being built out.
CREATE TYPE public.enquiry_status AS ENUM ('unread', 'contacted', 'awaiting_visit', 'enrolled', 'declined');

CREATE TABLE public.admission_enquiries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name       text NOT NULL,
  parent_phone      text NOT NULL,
  grade_interest    text NOT NULL,
  program_interest  text NOT NULL,
  message           text,
  status            public.enquiry_status NOT NULL DEFAULT 'unread',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_admission_enquiries_status ON public.admission_enquiries(status);

CREATE TRIGGER trg_admission_enquiries_updated_at
  BEFORE UPDATE ON public.admission_enquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.admission_enquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admissions_full_access"
  ON public.admission_enquiries FOR ALL
  USING (public.current_role() IN ('admissions_admin', 'super_admin'))
  WITH CHECK (public.current_role() IN ('admissions_admin', 'super_admin'));

CREATE POLICY "public_insert"
  ON public.admission_enquiries FOR INSERT
  TO anon
  WITH CHECK (true);
