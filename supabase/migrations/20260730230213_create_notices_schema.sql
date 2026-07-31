-- Rollback: DROP TABLE IF EXISTS public.notices;
--           DROP TYPE IF EXISTS public.notice_audience; DROP TYPE IF EXISTS public.notice_category;

-- `category` and `published` are beyond CLAUDE.md §5's literal baseline
-- (id, title, body, audience, published_at) — carried over from the
-- already-built UI per BACKEND-IMPLEMENTATION-PLAN.md Phase 8: the
-- super-admin notices page's publish/unpublish toggle and the category pills
-- shown across every consumer both depend on these columns existing.
CREATE TYPE public.notice_category AS ENUM ('Academic', 'Event', 'Holiday', 'Admissions');
CREATE TYPE public.notice_audience AS ENUM ('All', 'Students', 'Parents', 'Staff');

CREATE TABLE public.notices (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  body          text NOT NULL,
  category      public.notice_category NOT NULL,
  audience      public.notice_audience NOT NULL DEFAULT 'All',
  published     boolean NOT NULL DEFAULT true,
  published_at  timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notices_published ON public.notices(published, audience);

CREATE TRIGGER trg_notices_updated_at
  BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- Only Super Admin writes (matches the frontend — it's the only page with a
-- create/edit modal) — also covers Super Admin's own reads, including drafts.
CREATE POLICY "super_admin_manage_notices"
  ON public.notices FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

-- Every other staff role: published notices addressed to them or everyone.
CREATE POLICY "staff_read_published_notices"
  ON public.notices FOR SELECT
  USING (
    published = true
    AND public.current_role() IN ('admissions_admin', 'attendance_admin', 'marks_admin')
    AND audience IN ('All', 'Staff')
  );

-- One login per family (CLAUDE.md §4) — a parent needs both their own
-- audience ('Parents') and their child's ('Students'), since the student
-- notices screen is reached through the same session.
CREATE POLICY "parent_read_published_notices"
  ON public.notices FOR SELECT
  USING (
    published = true
    AND public.current_role() = 'parent'
    AND audience IN ('All', 'Parents', 'Students')
  );

-- Public landing page — only the broadest audience, never role-targeted notices.
CREATE POLICY "anon_read_published_all_audience_notices"
  ON public.notices FOR SELECT
  TO anon
  USING (published = true AND audience = 'All');
