-- Rollback: supabase/rollbacks/20261107140000_parent_meetings_rollback.sql

-- Parents Teacher Meetings. The administration creates a meeting with a briefing,
-- adds time slots, and publishes it. A parent then books one slot per child. A slot
-- holds one booking, and a child holds one booking per meeting — both enforced by
-- unique indexes, so two parents racing for the same slot cannot both win.

CREATE TABLE public.ptm_meetings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  meeting_date date NOT NULL,
  briefing     text CHECK (briefing IS NULL OR char_length(briefing) <= 4000),
  is_published boolean NOT NULL DEFAULT false,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ptm_meetings_date ON public.ptm_meetings (meeting_date);
CREATE INDEX idx_ptm_meetings_created_by ON public.ptm_meetings (created_by);
CREATE TRIGGER trg_ptm_meetings_updated_at BEFORE UPDATE ON public.ptm_meetings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ptm_slots (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.ptm_meetings(id) ON DELETE CASCADE,
  starts_at  timestamptz NOT NULL,
  ends_at    timestamptz NOT NULL,
  with_whom  text CHECK (with_whom IS NULL OR char_length(with_whom) <= 80),   -- teacher / coordinator
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_ptm_slots_meeting ON public.ptm_slots (meeting_id, starts_at);

CREATE TABLE public.ptm_bookings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id      uuid NOT NULL REFERENCES public.ptm_slots(id) ON DELETE CASCADE,
  meeting_id   uuid NOT NULL REFERENCES public.ptm_meetings(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  parent_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  note         text CHECK (note IS NULL OR char_length(note) <= 500),
  created_at   timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
CREATE UNIQUE INDEX uq_ptm_bookings_slot    ON public.ptm_bookings (slot_id)                WHERE cancelled_at IS NULL;
CREATE UNIQUE INDEX uq_ptm_bookings_student ON public.ptm_bookings (meeting_id, student_id) WHERE cancelled_at IS NULL;
CREATE INDEX idx_ptm_bookings_student ON public.ptm_bookings (student_id);
CREATE INDEX idx_ptm_bookings_parent ON public.ptm_bookings (parent_id);
CREATE INDEX idx_ptm_bookings_meeting ON public.ptm_bookings (meeting_id);

-- meeting_id always comes from the slot, never from the caller.
CREATE FUNCTION public.ptm_bookings_fill() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  SELECT s.meeting_id INTO NEW.meeting_id FROM public.ptm_slots s WHERE s.id = NEW.slot_id;
  IF NEW.meeting_id IS NULL THEN RAISE EXCEPTION 'Slot not found'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_ptm_bookings_fill BEFORE INSERT ON public.ptm_bookings
  FOR EACH ROW EXECUTE FUNCTION public.ptm_bookings_fill();

ALTER TABLE public.ptm_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptm_slots    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ptm_bookings ENABLE ROW LEVEL SECURITY;

-- Meetings and slots: the administration sees and manages all; everyone else sees published ones.
CREATE POLICY "ptm_meetings_select" ON public.ptm_meetings FOR SELECT TO authenticated
  USING (is_published OR (SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));
CREATE POLICY "ptm_meetings_insert" ON public.ptm_meetings FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));
CREATE POLICY "ptm_meetings_update" ON public.ptm_meetings FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'))
  WITH CHECK ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));
CREATE POLICY "ptm_meetings_delete" ON public.ptm_meetings FOR DELETE TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));

CREATE POLICY "ptm_slots_select" ON public.ptm_slots FOR SELECT TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin')
         OR EXISTS (SELECT 1 FROM public.ptm_meetings m WHERE m.id = ptm_slots.meeting_id AND m.is_published));
CREATE POLICY "ptm_slots_insert" ON public.ptm_slots FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));
CREATE POLICY "ptm_slots_update" ON public.ptm_slots FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'))
  WITH CHECK ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));
CREATE POLICY "ptm_slots_delete" ON public.ptm_slots FOR DELETE TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));

-- Bookings: a parent books and cancels only for their own linked child, on a published meeting;
-- the administration sees all and can cancel.
CREATE POLICY "ptm_bookings_select" ON public.ptm_bookings FOR SELECT TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin') OR parent_id = (SELECT auth.uid()));
CREATE POLICY "ptm_bookings_insert" ON public.ptm_bookings FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.current_role()) = 'parent'
    AND parent_id = (SELECT auth.uid()) AND cancelled_at IS NULL
    AND EXISTS (SELECT 1 FROM public.parent_student_links psl WHERE psl.student_id = ptm_bookings.student_id AND psl.parent_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.ptm_slots s JOIN public.ptm_meetings m ON m.id = s.meeting_id WHERE s.id = ptm_bookings.slot_id AND m.is_published)
  );
CREATE POLICY "ptm_bookings_update" ON public.ptm_bookings FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin') OR parent_id = (SELECT auth.uid()))
  WITH CHECK ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin') OR parent_id = (SELECT auth.uid()));

-- Which slots of a published meeting are already taken, without exposing who took them
-- (a parent's RLS only lets them see their own bookings).
CREATE FUNCTION public.ptm_taken_slots(p_meeting uuid) RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.slot_id FROM public.ptm_bookings b
  WHERE b.meeting_id = p_meeting AND b.cancelled_at IS NULL
    AND EXISTS (SELECT 1 FROM public.ptm_meetings m WHERE m.id = p_meeting AND m.is_published);
$$;
REVOKE EXECUTE ON FUNCTION public.ptm_taken_slots(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ptm_taken_slots(uuid) TO authenticated;
