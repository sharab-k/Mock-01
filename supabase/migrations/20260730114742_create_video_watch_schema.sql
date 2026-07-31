-- Rollback: DROP TABLE IF EXISTS public.video_watch_sessions;
--           DROP TABLE IF EXISTS public.video_lectures;

-- ── video_lectures ───────────────────────────────────────────────────────────
-- Catalog data — no content-management UI exists yet (out of this phase's
-- scope), so a handful of rows are seeded directly here, the same pattern
-- CLAUDE.md §10 already uses for the Super Admin account itself.
CREATE TABLE public.video_lectures (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  subject           text NOT NULL,
  duration_seconds  integer NOT NULL,
  storage_path      text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.video_lectures ENABLE ROW LEVEL SECURITY;

-- Non-sensitive course catalog — any signed-in profile can browse it.
CREATE POLICY "authenticated_read"
  ON public.video_lectures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "super_admin_manage"
  ON public.video_lectures FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');

INSERT INTO public.video_lectures (title, subject, duration_seconds) VALUES
  ('Quadratic Equations – Part 2',   'Mathematics', 38 * 60),
  ('Laws of Motion – Lecture 4',     'Physics',     44 * 60),
  ('Periodic Table & Trends',        'Chemistry',   31 * 60),
  ('Essay Structure & Techniques',   'English',     26 * 60),
  ('Cell Structure Overview',        'Biology',     29 * 60),
  ('Trigonometric Identities',       'Mathematics', 35 * 60);

-- ── video_watch_sessions ─────────────────────────────────────────────────────
-- `last_heartbeat_at` is beyond CLAUDE.md §5's literal column list, added so
-- the heartbeat endpoint can credit watch time from ITS OWN measured
-- wall-clock elapsed time between calls, never from a client-reported delta
-- or position. This is what makes seek-ahead a no-op (the server has no
-- concept of playback position, only "a heartbeat arrived") and makes
-- concurrent tabs on the same lecture not double-count (whichever tab's
-- heartbeat lands first claims that time window; the next tab's heartbeat
-- moments later measures a near-zero gap since the row was just updated).
CREATE TABLE public.video_watch_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lecture_id         uuid NOT NULL REFERENCES public.video_lectures(id) ON DELETE CASCADE,
  watched_seconds    integer NOT NULL DEFAULT 0,
  completed          boolean NOT NULL DEFAULT false,
  last_heartbeat_at  timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, lecture_id)
);

CREATE INDEX idx_video_watch_sessions_student ON public.video_watch_sessions(student_id);

CREATE TRIGGER trg_video_watch_sessions_updated_at
  BEFORE UPDATE ON public.video_watch_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.video_watch_sessions ENABLE ROW LEVEL SECURITY;

-- No separate student login exists (CLAUDE.md §4) — there's no student auth
-- id to match, so scoping is entirely through parent_student_links, same as
-- attendance_records/marks. No parent DELETE policy — a watch session is
-- never removed, only accumulated.
CREATE POLICY "parent_read_linked_children_watch_sessions"
  ON public.video_watch_sessions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = video_watch_sessions.student_id AND psl.parent_id = auth.uid()
  ));

CREATE POLICY "parent_insert_linked_children_watch_sessions"
  ON public.video_watch_sessions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = video_watch_sessions.student_id AND psl.parent_id = auth.uid()
  ));

CREATE POLICY "parent_update_linked_children_watch_sessions"
  ON public.video_watch_sessions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = video_watch_sessions.student_id AND psl.parent_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = video_watch_sessions.student_id AND psl.parent_id = auth.uid()
  ));

CREATE POLICY "super_admin_manage_watch_sessions"
  ON public.video_watch_sessions FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');
