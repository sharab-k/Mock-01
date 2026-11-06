-- Rollback: supabase/rollbacks/20261107120000_complaints_rollback.sql

-- Parent complaints. A parent files one for their own child; the administration
-- (Super Admin and Admissions Admin) reviews it, records the action taken and a
-- response, and moves its status. Every change is kept in complaint_history by a
-- trigger, so the full history cannot be skipped by any code path.

CREATE TYPE public.complaint_status AS ENUM ('pending', 'in_progress', 'resolved');

CREATE TABLE public.complaints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_no bigint GENERATED ALWAYS AS IDENTITY,
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subject      text NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 120),
  details      text NOT NULL CHECK (char_length(details) BETWEEN 1 AND 2000),
  status       public.complaint_status NOT NULL DEFAULT 'pending',
  action_taken text CHECK (action_taken IS NULL OR char_length(action_taken) <= 2000),
  response     text CHECK (response IS NULL OR char_length(response) <= 2000),
  action_date  date,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX uq_complaints_no ON public.complaints (complaint_no);
CREATE INDEX idx_complaints_student ON public.complaints (student_id);
CREATE INDEX idx_complaints_parent ON public.complaints (parent_id);
CREATE INDEX idx_complaints_status ON public.complaints (status);
CREATE INDEX idx_complaints_updated_by ON public.complaints (updated_by);

CREATE TABLE public.complaint_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  status       public.complaint_status NOT NULL,
  action_taken text,
  response     text,
  action_date  date,
  actor_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_complaint_history_complaint ON public.complaint_history (complaint_id, created_at);
CREATE INDEX idx_complaint_history_actor ON public.complaint_history (actor_id);

-- Keeps updated_at / updated_by current and writes the history row.
CREATE FUNCTION public.complaints_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.student_id IS DISTINCT FROM OLD.student_id OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
       OR NEW.subject IS DISTINCT FROM OLD.subject OR NEW.details IS DISTINCT FROM OLD.details
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'The complaint itself cannot be changed';
    END IF;
    NEW.updated_at := now();
    NEW.updated_by := auth.uid();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_complaints_touch BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.complaints_touch();

CREATE FUNCTION public.complaints_history() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.complaint_history (complaint_id, status, action_taken, response, action_date, actor_id)
  VALUES (NEW.id, NEW.status, NEW.action_taken, NEW.response, NEW.action_date, auth.uid());
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.complaints_history() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_complaints_history AFTER INSERT OR UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.complaints_history();

ALTER TABLE public.complaints        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_history ENABLE ROW LEVEL SECURITY;

-- The administration = Super Admin + Admissions Admin.
CREATE POLICY "complaints_select" ON public.complaints FOR SELECT TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin') OR parent_id = (SELECT auth.uid()));

-- A parent files only for their own linked child, as themselves, always starting Pending
-- with no action or response filled in.
CREATE POLICY "complaints_insert" ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.current_role()) = 'parent'
    AND parent_id = (SELECT auth.uid())
    AND status = 'pending' AND action_taken IS NULL AND response IS NULL AND action_date IS NULL
    AND EXISTS (SELECT 1 FROM public.parent_student_links psl WHERE psl.student_id = complaints.student_id AND psl.parent_id = (SELECT auth.uid()))
  );

CREATE POLICY "complaints_update" ON public.complaints FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'))
  WITH CHECK ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));

CREATE POLICY "complaint_history_select" ON public.complaint_history FOR SELECT TO authenticated
  USING (
    (SELECT public.current_role()) IN ('super_admin', 'admissions_admin')
    OR EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_history.complaint_id AND c.parent_id = (SELECT auth.uid()))
  );
