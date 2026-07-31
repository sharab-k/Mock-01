-- Rollback: DROP TABLE IF EXISTS public.audit_log;

-- Super Admin's "master raw log audit" (SOW §3). Deliberately minimal per
-- CLAUDE.md §5 / the plan's schema-additions note: a single `action` text
-- column holds the full human-readable entry, no separate `detail` column,
-- no stored `flagged` column — "flagged" is derived at query/render time
-- against a small keyword list, not set per call site.
CREATE TABLE public.audit_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Insert-only, and only for your own actions — every write goes through a
-- Server Action's logAction() call on the caller's own session client, never
-- a service-role bypass, so actor_id can't be spoofed to someone else.
CREATE POLICY "insert_own_actions"
  ON public.audit_log FOR INSERT
  TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- Only super_admin can read the log — everyone else's audit trail is
-- write-only from their own seat, matching CLAUDE.md's "master audit log" as
-- a Super Admin-only surface.
CREATE POLICY "super_admin_select_all"
  ON public.audit_log FOR SELECT
  TO authenticated
  USING (public.current_role() = 'super_admin');
