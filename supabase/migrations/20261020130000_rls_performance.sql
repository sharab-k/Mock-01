-- Rollback: run supabase/rollbacks/20261020130000_rls_performance_rollback.sql (recreates every original policy).

-- Row-level-security performance rewrite — SAME ACCESS RULES, cheaper to evaluate.
-- Supabase's advisor reported 16 `auth_rls_initplan` and 86 `multiple_permissive_policies`
-- findings. Mechanical, behaviour-preserving changes only:
--   1. auth.uid() and current_role() are wrapped in (SELECT …) so Postgres evaluates
--      them ONCE per statement instead of once per row (with SECURITY DEFINER
--      current_role() that was a profiles lookup per row).
--   2. Where a table had several permissive policies for the same command, they are
--      merged into one policy per command whose test is the OR of the originals —
--      exactly how Postgres already combined them, minus evaluating each separately.
--   3. Policies that were `TO public` are now `TO authenticated`: every one of them tests
--      current_role()/auth.uid(), which are NULL for anonymous callers, so anonymous
--      access is unchanged (the anon-specific policies are untouched).
-- Verified by a before/after probe of every role (super admin, each staff role, two
-- parents, anonymous) over reads, inserts, updates and deletes on the main tables.

-- -- admission_enquiries -----------------------------------------
DROP POLICY IF EXISTS "admissions_full_access" ON public.admission_enquiries;
CREATE POLICY "admissions_full_access" ON public.admission_enquiries AS PERMISSIVE FOR ALL TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));

-- -- attendance_records ------------------------------------------
DROP POLICY IF EXISTS "attendance_full_access" ON public.attendance_records;
DROP POLICY IF EXISTS "parent_read_linked_children_attendance" ON public.attendance_records;
CREATE POLICY "attendance_records_select" ON public.attendance_records AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = ANY (ARRAY['attendance_admin'::user_role, 'super_admin'::user_role])))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = attendance_records.student_id) AND (psl.parent_id = (SELECT auth.uid())))))));

CREATE POLICY "attendance_records_insert" ON public.attendance_records AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['attendance_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "attendance_records_update" ON public.attendance_records AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['attendance_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['attendance_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "attendance_records_delete" ON public.attendance_records AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['attendance_admin'::user_role, 'super_admin'::user_role])));

-- -- audit_log ---------------------------------------------------
DROP POLICY IF EXISTS "insert_own_actions" ON public.audit_log;
DROP POLICY IF EXISTS "super_admin_select_all" ON public.audit_log;
CREATE POLICY "audit_log_select" ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "audit_log_insert" ON public.audit_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((actor_id = (SELECT auth.uid())));

-- -- class_timetable_periods -------------------------------------
DROP POLICY IF EXISTS "super_admin_full_access" ON public.class_timetable_periods;
CREATE POLICY "super_admin_full_access" ON public.class_timetable_periods AS PERMISSIVE FOR ALL TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role))
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

-- -- fee_payments ------------------------------------------------
DROP POLICY IF EXISTS "super_admin_full_access" ON public.fee_payments;
DROP POLICY IF EXISTS "parent_read_linked_children" ON public.fee_payments;
CREATE POLICY "fee_payments_select" ON public.fee_payments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = 'super_admin'::user_role))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = fee_payments.student_id) AND (psl.parent_id = (SELECT auth.uid())))))));

CREATE POLICY "fee_payments_insert" ON public.fee_payments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "fee_payments_update" ON public.fee_payments AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role))
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "fee_payments_delete" ON public.fee_payments AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role));

-- -- marks -------------------------------------------------------
DROP POLICY IF EXISTS "marks_full_access" ON public.marks;
DROP POLICY IF EXISTS "parent_read_linked_children_marks" ON public.marks;
CREATE POLICY "marks_select" ON public.marks AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = marks.student_id) AND (psl.parent_id = (SELECT auth.uid())))))));

CREATE POLICY "marks_insert" ON public.marks AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "marks_update" ON public.marks AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "marks_delete" ON public.marks AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

-- -- marks_edit_history ------------------------------------------
DROP POLICY IF EXISTS "marks_staff_insert" ON public.marks_edit_history;
DROP POLICY IF EXISTS "marks_staff_read" ON public.marks_edit_history;
CREATE POLICY "marks_edit_history_select" ON public.marks_edit_history AS PERMISSIVE FOR SELECT TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "marks_edit_history_insert" ON public.marks_edit_history AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

-- -- notices -----------------------------------------------------
DROP POLICY IF EXISTS "super_admin_manage_notices" ON public.notices;
DROP POLICY IF EXISTS "parent_read_published_notices" ON public.notices;
DROP POLICY IF EXISTS "staff_read_published_notices" ON public.notices;
CREATE POLICY "notices_select" ON public.notices AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = 'super_admin'::user_role))
    OR (((published = true) AND ((SELECT public."current_role"()) = 'parent'::user_role) AND (audience = ANY (ARRAY['All'::notice_audience, 'Parents'::notice_audience, 'Students'::notice_audience]))))
    OR (((published = true) AND ((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'attendance_admin'::user_role, 'marks_admin'::user_role])) AND (audience = ANY (ARRAY['All'::notice_audience, 'Staff'::notice_audience])))));

CREATE POLICY "notices_insert" ON public.notices AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "notices_update" ON public.notices AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role))
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "notices_delete" ON public.notices AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role));

-- -- notification_log --------------------------------------------
DROP POLICY IF EXISTS "staff_full_access" ON public.notification_log;
CREATE POLICY "staff_full_access" ON public.notification_log AS PERMISSIVE FOR ALL TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['attendance_admin'::user_role, 'marks_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['attendance_admin'::user_role, 'marks_admin'::user_role, 'super_admin'::user_role])));

-- -- parent_student_links ----------------------------------------
DROP POLICY IF EXISTS "admissions_full_access" ON public.parent_student_links;
DROP POLICY IF EXISTS "parent_read_own_links" ON public.parent_student_links;
CREATE POLICY "parent_student_links_select" ON public.parent_student_links AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])))
    OR ((parent_id = (SELECT auth.uid()))));

CREATE POLICY "parent_student_links_insert" ON public.parent_student_links AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "parent_student_links_update" ON public.parent_student_links AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "parent_student_links_delete" ON public.parent_student_links AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));

-- -- portal_notifications ----------------------------------------
DROP POLICY IF EXISTS "parent_read_own_notifications" ON public.portal_notifications;
DROP POLICY IF EXISTS "super_admin_read_all_notifications" ON public.portal_notifications;
DROP POLICY IF EXISTS "parent_mark_own_notifications_read" ON public.portal_notifications;
CREATE POLICY "portal_notifications_select" ON public.portal_notifications AS PERMISSIVE FOR SELECT TO authenticated
  USING (((parent_id = (SELECT auth.uid())))
    OR (((SELECT public."current_role"()) = 'super_admin'::user_role)));

CREATE POLICY "portal_notifications_update" ON public.portal_notifications AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((parent_id = (SELECT auth.uid())))
  WITH CHECK ((parent_id = (SELECT auth.uid())));

-- -- profiles ----------------------------------------------------
DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING (((SELECT auth.uid()) = id));

-- -- student_subject_enrollments ---------------------------------
DROP POLICY IF EXISTS "super_admin_manage_enrollments" ON public.student_subject_enrollments;
DROP POLICY IF EXISTS "marks_admin_read_enrollments" ON public.student_subject_enrollments;
DROP POLICY IF EXISTS "parent_read_linked_children_enrollments" ON public.student_subject_enrollments;
CREATE POLICY "student_subject_enrollments_select" ON public.student_subject_enrollments AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = 'super_admin'::user_role))
    OR (((SELECT public."current_role"()) = 'marks_admin'::user_role))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = student_subject_enrollments.student_id) AND (psl.parent_id = (SELECT auth.uid())))))));

CREATE POLICY "student_subject_enrollments_insert" ON public.student_subject_enrollments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "student_subject_enrollments_update" ON public.student_subject_enrollments AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role))
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "student_subject_enrollments_delete" ON public.student_subject_enrollments AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role));

-- -- student_subject_exclusions ----------------------------------
DROP POLICY IF EXISTS "super_admin_manage_exclusions" ON public.student_subject_exclusions;
DROP POLICY IF EXISTS "marks_admin_read_exclusions" ON public.student_subject_exclusions;
DROP POLICY IF EXISTS "parent_read_linked_children_exclusions" ON public.student_subject_exclusions;
CREATE POLICY "student_subject_exclusions_select" ON public.student_subject_exclusions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = 'super_admin'::user_role))
    OR (((SELECT public."current_role"()) = 'marks_admin'::user_role))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = student_subject_exclusions.student_id) AND (psl.parent_id = (SELECT auth.uid())))))));

CREATE POLICY "student_subject_exclusions_insert" ON public.student_subject_exclusions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "student_subject_exclusions_update" ON public.student_subject_exclusions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role))
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "student_subject_exclusions_delete" ON public.student_subject_exclusions AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role));

-- -- students ----------------------------------------------------
DROP POLICY IF EXISTS "admissions_full_access" ON public.students;
DROP POLICY IF EXISTS "parent_read_linked_children" ON public.students;
DROP POLICY IF EXISTS "staff_read_access" ON public.students;
CREATE POLICY "students_select" ON public.students AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = students.id) AND (psl.parent_id = (SELECT auth.uid()))))))
    OR (((SELECT public."current_role"()) = ANY (ARRAY['attendance_admin'::user_role, 'marks_admin'::user_role]))));

CREATE POLICY "students_insert" ON public.students AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "students_update" ON public.students AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "students_delete" ON public.students AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));

-- -- subjects ----------------------------------------------------
DROP POLICY IF EXISTS "staff_manage_subjects" ON public.subjects;
DROP POLICY IF EXISTS "parent_read_linked_children_subjects" ON public.subjects;
DROP POLICY IF EXISTS "staff_read_subjects" ON public.subjects;
CREATE POLICY "subjects_select" ON public.subjects AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = ANY (ARRAY['super_admin'::user_role, 'marks_admin'::user_role])))
    OR ((EXISTS ( SELECT 1
   FROM (parent_student_links psl
     JOIN students s ON ((s.id = psl.student_id)))
  WHERE ((psl.parent_id = (SELECT auth.uid())) AND (s.grade_level = subjects.grade_level)))))
    OR (((SELECT public."current_role"()) = ANY (ARRAY['super_admin'::user_role, 'admissions_admin'::user_role, 'attendance_admin'::user_role, 'marks_admin'::user_role]))));

CREATE POLICY "subjects_insert" ON public.subjects AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['super_admin'::user_role, 'marks_admin'::user_role])));

CREATE POLICY "subjects_update" ON public.subjects AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['super_admin'::user_role, 'marks_admin'::user_role])))
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['super_admin'::user_role, 'marks_admin'::user_role])));

CREATE POLICY "subjects_delete" ON public.subjects AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['super_admin'::user_role, 'marks_admin'::user_role])));

-- -- teachers ----------------------------------------------------
DROP POLICY IF EXISTS "super_admin_full_access" ON public.teachers;
CREATE POLICY "super_admin_full_access" ON public.teachers AS PERMISSIVE FOR ALL TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role))
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

-- -- tests -------------------------------------------------------
DROP POLICY IF EXISTS "marks_staff_manage_tests" ON public.tests;
DROP POLICY IF EXISTS "parent_read_linked_children_tests" ON public.tests;
CREATE POLICY "tests_select" ON public.tests AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])))
    OR ((EXISTS ( SELECT 1
   FROM (parent_student_links psl
     JOIN students s ON ((s.id = psl.student_id)))
  WHERE ((psl.parent_id = (SELECT auth.uid())) AND (s.grade_level = tests.grade_level) AND (s.section = tests.section))))));

CREATE POLICY "tests_insert" ON public.tests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "tests_update" ON public.tests AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

CREATE POLICY "tests_delete" ON public.tests AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

-- -- video_lectures ----------------------------------------------
DROP POLICY IF EXISTS "super_admin_manage" ON public.video_lectures;
DROP POLICY IF EXISTS "authenticated_read" ON public.video_lectures;
CREATE POLICY "video_lectures_select" ON public.video_lectures AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "video_lectures_insert" ON public.video_lectures AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "video_lectures_update" ON public.video_lectures AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role))
  WITH CHECK (((SELECT public."current_role"()) = 'super_admin'::user_role));

CREATE POLICY "video_lectures_delete" ON public.video_lectures AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role));

-- -- video_watch_sessions ----------------------------------------
DROP POLICY IF EXISTS "super_admin_manage_watch_sessions" ON public.video_watch_sessions;
DROP POLICY IF EXISTS "parent_insert_linked_children_watch_sessions" ON public.video_watch_sessions;
DROP POLICY IF EXISTS "parent_read_linked_children_watch_sessions" ON public.video_watch_sessions;
DROP POLICY IF EXISTS "parent_update_linked_children_watch_sessions" ON public.video_watch_sessions;
CREATE POLICY "video_watch_sessions_select" ON public.video_watch_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((SELECT public."current_role"()) = 'super_admin'::user_role))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = video_watch_sessions.student_id) AND (psl.parent_id = (SELECT auth.uid())))))));

CREATE POLICY "video_watch_sessions_insert" ON public.video_watch_sessions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((((SELECT public."current_role"()) = 'super_admin'::user_role))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = video_watch_sessions.student_id) AND (psl.parent_id = (SELECT auth.uid())))))));

CREATE POLICY "video_watch_sessions_update" ON public.video_watch_sessions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((((SELECT public."current_role"()) = 'super_admin'::user_role))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = video_watch_sessions.student_id) AND (psl.parent_id = (SELECT auth.uid())))))))
  WITH CHECK ((((SELECT public."current_role"()) = 'super_admin'::user_role))
    OR ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = video_watch_sessions.student_id) AND (psl.parent_id = (SELECT auth.uid())))))));

CREATE POLICY "video_watch_sessions_delete" ON public.video_watch_sessions AS PERMISSIVE FOR DELETE TO authenticated
  USING (((SELECT public."current_role"()) = 'super_admin'::user_role));

