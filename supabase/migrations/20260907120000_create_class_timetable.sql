-- Rollback: DROP TABLE IF EXISTS public.class_timetable_periods; DROP TYPE IF EXISTS public.weekday;

-- ── class_timetable_periods ──────────────────────────────────────────────────
-- Super Admin's per-class weekly timetable: one row per period. Scoped to
-- grade+section (confirmed: "time table of each class and each section will
-- be different" — the same grade's two sections can have completely
-- different schedules, unlike subjects which are grade-wide). No separate
-- "timetable" parent row — the periods themselves, filtered by
-- grade_level+section, ARE the class's timetable; there's no additional
-- metadata to hang above them. Persists indefinitely ("used the whole
-- year") until Super Admin edits or removes a period — nothing here is
-- date-scoped to a term or week.
CREATE TYPE public.weekday AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday');

CREATE TABLE public.class_timetable_periods (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade_level  text NOT NULL,
  section      text NOT NULL,
  day_of_week  public.weekday NOT NULL,
  start_time   time NOT NULL,
  end_time     time NOT NULL,
  subject      text NOT NULL,
  -- Nullable, not required — Super Admin may block out a period's time/
  -- subject before a teacher is assigned to it, and ON DELETE SET NULL so
  -- removing a teacher from public.teachers doesn't cascade-delete every
  -- period they were ever scheduled for.
  teacher_id   uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

CREATE INDEX idx_class_timetable_periods_class ON public.class_timetable_periods(grade_level, section, day_of_week);
CREATE INDEX idx_class_timetable_periods_teacher ON public.class_timetable_periods(teacher_id) WHERE teacher_id IS NOT NULL;

CREATE TRIGGER trg_class_timetable_periods_updated_at
  BEFORE UPDATE ON public.class_timetable_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.class_timetable_periods ENABLE ROW LEVEL SECURITY;

-- Super Admin only, matching public.teachers' own scope (this table embeds
-- teacher names via teacher_id, and teachers itself is super_admin-only —
-- keeping the same boundary here avoids a policy split that would just
-- surface teacher rows as null to a role that can't read teachers anyway).
-- Widen this later if another role needs to see a class's timetable.
CREATE POLICY "super_admin_full_access"
  ON public.class_timetable_periods FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');
