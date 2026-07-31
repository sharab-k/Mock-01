-- Rollback: DROP TABLE IF EXISTS public.notification_log;
--           DROP TYPE IF EXISTS public.notification_status; DROP TYPE IF EXISTS public.notification_channel;
--           DROP TABLE IF EXISTS public.attendance_records; DROP TYPE IF EXISTS public.attendance_status;

-- ── attendance_records ──────────────────────────────────────────────────────
-- One row per student per class_date (UNIQUE) — the "single-click check-in"
-- flow upserts this row rather than appending duplicates, and the app layer
-- distinguishes a genuine first-time INSERT (fires the notification pipeline)
-- from a same-day correction UPDATE (does not re-notify), per CLAUDE.md §7's
-- "not on every update" rule.
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');

CREATE TABLE public.attendance_records (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  class_date  date NOT NULL DEFAULT current_date,
  status      public.attendance_status NOT NULL,
  marked_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_date)
);

CREATE INDEX idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX idx_attendance_records_class_date ON public.attendance_records(class_date);

CREATE TRIGGER trg_attendance_records_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attendance_full_access"
  ON public.attendance_records FOR ALL
  USING (public.current_role() IN ('attendance_admin', 'super_admin'))
  WITH CHECK (public.current_role() IN ('attendance_admin', 'super_admin'));

-- No separate student login exists (CLAUDE.md §4) — a parent's own session
-- covers both the multi-sibling view and any single-child drill-down.
CREATE POLICY "parent_read_linked_children_attendance"
  ON public.attendance_records FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = attendance_records.student_id AND psl.parent_id = auth.uid()
  ));

-- ── notification_log ────────────────────────────────────────────────────────
-- Audit trail for the WhatsApp/SMS pipeline. marks_admin is included now
-- (not just attendance_admin) because Phase 4 reuses this exact table for
-- grade-alert notifications, per CLAUDE.md §11's build order.
CREATE TYPE public.notification_channel AS ENUM ('whatsapp', 'sms');
CREATE TYPE public.notification_status AS ENUM ('sent', 'failed');

CREATE TABLE public.notification_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     public.notification_channel NOT NULL,
  recipient   text NOT NULL,
  payload     text NOT NULL,
  status      public.notification_status NOT NULL,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_log_status ON public.notification_log(status);

ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_full_access"
  ON public.notification_log FOR ALL
  USING (public.current_role() IN ('attendance_admin', 'marks_admin', 'super_admin'))
  WITH CHECK (public.current_role() IN ('attendance_admin', 'marks_admin', 'super_admin'));
