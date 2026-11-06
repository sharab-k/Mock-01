-- Reverses 20261106120000_subject_wise_attendance.sql.
-- Subject-wise rows cannot fit the old one-row-per-day key, so they are removed
-- first (whole-day rows, subject = '', are untouched).
BEGIN;

DELETE FROM public.attendance_records WHERE subject <> '';

DROP INDEX IF EXISTS public.idx_attendance_records_date_subject;
ALTER TABLE public.attendance_records DROP CONSTRAINT IF EXISTS attendance_records_student_date_subject_key;
ALTER TABLE public.attendance_records ADD CONSTRAINT attendance_records_student_id_class_date_key UNIQUE (student_id, class_date);
ALTER TABLE public.attendance_records DROP COLUMN subject;

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

COMMIT;
