-- Rollback: DROP TABLE IF EXISTS public.teachers;

-- Real teacher directory, added beyond CLAUDE.md §5's baseline schema at the
-- client's request. Deliberately not an auth role — teachers don't sign in
-- (per the confirmed decision: Super Admin manages this as a roster, no
-- teacher login/portal). Informational fields only, matching what the
-- Super Admin Teaching Staff screen already displayed as mock data.
CREATE TABLE public.teachers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  text        NOT NULL,
  subject    text        NOT NULL,
  classes    text[]      NOT NULL DEFAULT '{}',
  email      text,
  phone      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_teachers_updated_at
  BEFORE UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Super Admin only — this roster isn't read by any other role's dashboard
-- today; scope can widen later if e.g. attendance_admin needs to see it.
CREATE POLICY "super_admin_full_access"
  ON public.teachers FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');
