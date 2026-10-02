-- Rollback: DROP TABLE IF EXISTS public.portal_notifications;

-- In-app (parent portal) notifications. WhatsApp/SMS is the external channel
-- and can be blocked at the provider; this is the always-available one — every
-- absence/grade alert is also written here, per linked parent, so it appears in
-- that parent's portal inbox and in Super Admin's sent-notifications view.
-- Rows are only ever created by the server pipeline (service-role client), so
-- there is deliberately no INSERT policy for any app role.
CREATE TABLE public.portal_notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('absence', 'grade')),
  title       text NOT NULL,
  body        text NOT NULL,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  read_at     timestamptz
);

CREATE INDEX idx_portal_notifications_parent ON public.portal_notifications(parent_id, created_at DESC);
CREATE INDEX idx_portal_notifications_student ON public.portal_notifications(student_id, created_at DESC);

ALTER TABLE public.portal_notifications ENABLE ROW LEVEL SECURITY;

-- A parent sees only their own inbox.
CREATE POLICY "parent_read_own_notifications"
  ON public.portal_notifications FOR SELECT
  USING (parent_id = auth.uid());

-- ...and may mark their own as read. Column-level grant below means read_at
-- is the only thing an authenticated user can ever change on a row.
CREATE POLICY "parent_mark_own_notifications_read"
  ON public.portal_notifications FOR UPDATE
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- Super Admin sees everything that was sent.
CREATE POLICY "super_admin_read_all_notifications"
  ON public.portal_notifications FOR SELECT
  USING (public.current_role() = 'super_admin');

REVOKE UPDATE ON public.portal_notifications FROM authenticated;
GRANT UPDATE (read_at) ON public.portal_notifications TO authenticated;
