-- Rollback:
--   DROP POLICY IF EXISTS "staff_manage_subjects" ON public.subjects;
--   CREATE POLICY "super_admin_manage_subjects" ON public.subjects FOR ALL
--     USING (public.current_role() = 'super_admin')
--     WITH CHECK (public.current_role() = 'super_admin');

-- Marks Admin builds tests against subjects and needs to add/remove a class's
-- subjects itself, not wait on Super Admin. Soft delete stays the only
-- removal path (the app sets deleted_at), so historical tests/marks are
-- untouched either way. Elected-subject *enrollment* is deliberately left
-- Super-Admin-only (student_subject_enrollments policies unchanged).
DROP POLICY IF EXISTS "super_admin_manage_subjects" ON public.subjects;

CREATE POLICY "staff_manage_subjects"
  ON public.subjects FOR ALL
  USING (public.current_role() IN ('super_admin', 'marks_admin'))
  WITH CHECK (public.current_role() IN ('super_admin', 'marks_admin'));
