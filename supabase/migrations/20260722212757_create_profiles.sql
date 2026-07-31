-- Rollback: DROP TABLE IF EXISTS public.profiles; DROP FUNCTION IF EXISTS public.current_role();
--           DROP FUNCTION IF EXISTS public.set_updated_at(); DROP TYPE IF EXISTS public.user_role;

-- Enum: the 6 real roles, no teacher (removed from the app in an earlier phase)
CREATE TYPE public.user_role AS ENUM (
  'super_admin',
  'admissions_admin',
  'attendance_admin',
  'marks_admin',
  'student',
  'parent'
);

CREATE TABLE public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        public.user_role NOT NULL,
  full_name   text,
  phone       text,
  email       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Auto-touch updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helper every later phase's RLS reuses — SECURITY DEFINER so it reads
-- profiles bypassing RLS, avoiding the classic "policy on profiles that
-- queries profiles" infinite-recursion footgun.
CREATE OR REPLACE FUNCTION public.current_role()
RETURNS public.user_role
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_role() TO authenticated;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Deliberately no INSERT/UPDATE policy for authenticated/anon yet — profiles
-- are only ever created by an admin action via the service role key (which
-- bypasses RLS automatically), matching CLAUDE.md golden rule 9 (no public
-- self-registration). Self-service profile edits come in a later phase.
