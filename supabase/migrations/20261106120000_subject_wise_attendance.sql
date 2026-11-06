-- Rollback: supabase/rollbacks/20261106120000_subject_wise_attendance_rollback.sql

-- First Year attends by faculty and subject, not for a fixed full day, so one
-- student can have several attendance rows on the same date — one per subject.
-- `subject` is '' for the whole-day marking the other grades still use, and a
-- subject name (Physics, Urdu, …) for First Year. It is NOT NULL with a ''
-- default (not NULL) so the unique key below is a plain column list, which is
-- what the app's upsert (onConflict) needs, and so every existing row is
-- already valid.
ALTER TABLE public.attendance_records
  ADD COLUMN subject text NOT NULL DEFAULT '' CHECK (char_length(subject) <= 40);

-- Swap UNIQUE (student_id, class_date) for UNIQUE (student_id, class_date,
-- subject). The old constraint is looked up by its columns, not its name.
DO $$
DECLARE
  v_name text;
BEGIN
  SELECT c.conname INTO v_name
  FROM pg_constraint c
  WHERE c.conrelid = 'public.attendance_records'::regclass
    AND c.contype = 'u'
    AND (SELECT array_agg(a.attname ORDER BY a.attname)
         FROM unnest(c.conkey) k JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k)
        = ARRAY['class_date', 'student_id']::name[];
  IF v_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.attendance_records DROP CONSTRAINT %I', v_name);
  END IF;
END $$;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_student_date_subject_key UNIQUE (student_id, class_date, subject);

-- The subject-wise roster reads one date + subject at a time.
CREATE INDEX idx_attendance_records_date_subject ON public.attendance_records(class_date, subject);

-- The absence notice now names the subject when there is one, so a student
-- absent from two lectures in a day gets two clear notices rather than one
-- vague one. Whole-day records keep the exact original wording, which also
-- matches lib/notifications/message-templates.ts.
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
  v_what text;
BEGIN
  SELECT btrim(full_name), roll_number INTO v_name, v_roll
  FROM public.students
  WHERE id = NEW.student_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_what := CASE WHEN NEW.subject = '' THEN '' ELSE ' from the ' || NEW.subject || ' class' END;

  v_msg := E'Notification of Absence.\n\nDear Parents,\n'
        || v_name || ', having GR# ' || v_roll
        || ', is absent today (' || to_char(NEW.class_date, 'FMDD FMMonth YYYY') || ')' || v_what
        || E'. Kindly ensure they cover the missed work.\n\nRegards,\nJ.E Academy.';

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
