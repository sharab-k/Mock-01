-- Rollback:
--   DROP TRIGGER IF EXISTS trg_notify_parents_absence_insert ON public.attendance_records;
--   DROP TRIGGER IF EXISTS trg_notify_parents_absence_update ON public.attendance_records;
--   DROP FUNCTION IF EXISTS public.notify_parents_on_absence();

-- The "student marked absent" EVENT. Whenever an attendance row becomes
-- 'absent' — a fresh insert, or a correction from present/late — every parent
-- account linked to that student gets a notification in their JE portal inbox.
-- No external provider (Twilio) is involved.
--
-- Doing this in the database rather than in app code means it fires no matter
-- how the row was written (web, phone app, bulk submit, a future import) and
-- can't be skipped by a code path that forgets to call it.
--
--   * Fires on INSERT as 'absent', and on UPDATE only when the status CHANGES
--     to 'absent' — re-saving an already-absent row never re-notifies.
--   * Idempotent: an identical message for the same parent/student is never
--     inserted twice (so a Resend from the app can't duplicate it either).
--   * Never blocks the attendance write: any failure here is downgraded to a
--     WARNING (CLAUDE.md §7 — a notification problem must not roll back the
--     academic record).
--   * SECURITY DEFINER because portal_notifications has no INSERT policy for any
--     app role by design; this function is the only writer besides the server.
--
-- The message text matches lib/notifications/message-templates.ts exactly.
CREATE OR REPLACE FUNCTION public.notify_parents_on_absence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_roll text;
  v_msg  text;
BEGIN
  SELECT btrim(full_name), roll_number INTO v_name, v_roll
  FROM public.students
  WHERE id = NEW.student_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_msg := E'Notification of Absence.\n\nDear Parents,\n'
        || v_name || ', having GR# ' || v_roll
        || ', is absent today (' || to_char(NEW.class_date, 'FMDD FMMonth YYYY')
        || E'). Kindly ensure they cover the missed work.\n\nRegards,\nJ.E Academy.';

  INSERT INTO public.portal_notifications (parent_id, parent_name, student_id, kind, title, body, created_by)
  SELECT l.parent_id, COALESCE(p.full_name, ''), NEW.student_id, 'absence', 'Notification of Absence', v_msg, NEW.marked_by
  FROM public.parent_student_links l
  JOIN public.profiles p ON p.id = l.parent_id
  WHERE l.student_id = NEW.student_id
    AND NOT EXISTS (
      SELECT 1 FROM public.portal_notifications n
      WHERE n.parent_id = l.parent_id
        AND n.student_id = NEW.student_id
        AND n.kind = 'absence'
        AND n.body = v_msg
    );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_parents_on_absence failed for student %: %', NEW.student_id, SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_parents_absence_insert ON public.attendance_records;
CREATE TRIGGER trg_notify_parents_absence_insert
  AFTER INSERT ON public.attendance_records
  FOR EACH ROW WHEN (NEW.status = 'absent')
  EXECUTE FUNCTION public.notify_parents_on_absence();

DROP TRIGGER IF EXISTS trg_notify_parents_absence_update ON public.attendance_records;
CREATE TRIGGER trg_notify_parents_absence_update
  AFTER UPDATE OF status ON public.attendance_records
  FOR EACH ROW WHEN (NEW.status = 'absent' AND OLD.status IS DISTINCT FROM 'absent')
  EXECUTE FUNCTION public.notify_parents_on_absence();
