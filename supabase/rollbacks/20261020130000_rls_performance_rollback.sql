-- Restores the original (pre-rewrite) row-level-security policies.

DROP POLICY IF EXISTS "admissions_full_access" ON public.admission_enquiries;
DROP POLICY IF EXISTS "public_insert" ON public.admission_enquiries;
CREATE POLICY "admissions_full_access" ON public.admission_enquiries AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (("current_role"() = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));
CREATE POLICY "public_insert" ON public.admission_enquiries AS PERMISSIVE FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "attendance_full_access" ON public.attendance_records;
DROP POLICY IF EXISTS "parent_read_linked_children_attendance" ON public.attendance_records;
CREATE POLICY "attendance_full_access" ON public.attendance_records AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = ANY (ARRAY['attendance_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (("current_role"() = ANY (ARRAY['attendance_admin'::user_role, 'super_admin'::user_role])));
CREATE POLICY "parent_read_linked_children_attendance" ON public.attendance_records AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = attendance_records.student_id) AND (psl.parent_id = auth.uid())))));

DROP POLICY IF EXISTS "insert_own_actions" ON public.audit_log;
DROP POLICY IF EXISTS "super_admin_select_all" ON public.audit_log;
CREATE POLICY "insert_own_actions" ON public.audit_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((actor_id = auth.uid()));
CREATE POLICY "super_admin_select_all" ON public.audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING (("current_role"() = 'super_admin'::user_role));

DROP POLICY IF EXISTS "super_admin_full_access" ON public.class_timetable_periods;
CREATE POLICY "super_admin_full_access" ON public.class_timetable_periods AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'super_admin'::user_role))
  WITH CHECK (("current_role"() = 'super_admin'::user_role));

DROP POLICY IF EXISTS "super_admin_full_access" ON public.fee_payments;
DROP POLICY IF EXISTS "parent_read_linked_children" ON public.fee_payments;
CREATE POLICY "super_admin_full_access" ON public.fee_payments AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'super_admin'::user_role))
  WITH CHECK (("current_role"() = 'super_admin'::user_role));
CREATE POLICY "parent_read_linked_children" ON public.fee_payments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = fee_payments.student_id) AND (psl.parent_id = auth.uid())))));

DROP POLICY IF EXISTS "marks_full_access" ON public.marks;
DROP POLICY IF EXISTS "parent_read_linked_children_marks" ON public.marks;
CREATE POLICY "marks_full_access" ON public.marks AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (("current_role"() = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));
CREATE POLICY "parent_read_linked_children_marks" ON public.marks AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = marks.student_id) AND (psl.parent_id = auth.uid())))));

DROP POLICY IF EXISTS "marks_staff_insert" ON public.marks_edit_history;
DROP POLICY IF EXISTS "marks_staff_read" ON public.marks_edit_history;
CREATE POLICY "marks_staff_insert" ON public.marks_edit_history AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (("current_role"() = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));
CREATE POLICY "marks_staff_read" ON public.marks_edit_history AS PERMISSIVE FOR SELECT TO public
  USING (("current_role"() = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));

DROP POLICY IF EXISTS "super_admin_manage_notices" ON public.notices;
DROP POLICY IF EXISTS "anon_read_published_all_audience_notices" ON public.notices;
DROP POLICY IF EXISTS "parent_read_published_notices" ON public.notices;
DROP POLICY IF EXISTS "staff_read_published_notices" ON public.notices;
CREATE POLICY "super_admin_manage_notices" ON public.notices AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'super_admin'::user_role))
  WITH CHECK (("current_role"() = 'super_admin'::user_role));
CREATE POLICY "anon_read_published_all_audience_notices" ON public.notices AS PERMISSIVE FOR SELECT TO anon
  USING (((published = true) AND (audience = 'All'::notice_audience)));
CREATE POLICY "parent_read_published_notices" ON public.notices AS PERMISSIVE FOR SELECT TO public
  USING (((published = true) AND ("current_role"() = 'parent'::user_role) AND (audience = ANY (ARRAY['All'::notice_audience, 'Parents'::notice_audience, 'Students'::notice_audience]))));
CREATE POLICY "staff_read_published_notices" ON public.notices AS PERMISSIVE FOR SELECT TO public
  USING (((published = true) AND ("current_role"() = ANY (ARRAY['admissions_admin'::user_role, 'attendance_admin'::user_role, 'marks_admin'::user_role])) AND (audience = ANY (ARRAY['All'::notice_audience, 'Staff'::notice_audience]))));

DROP POLICY IF EXISTS "staff_full_access" ON public.notification_log;
CREATE POLICY "staff_full_access" ON public.notification_log AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = ANY (ARRAY['attendance_admin'::user_role, 'marks_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (("current_role"() = ANY (ARRAY['attendance_admin'::user_role, 'marks_admin'::user_role, 'super_admin'::user_role])));

DROP POLICY IF EXISTS "admissions_full_access" ON public.parent_student_links;
DROP POLICY IF EXISTS "parent_read_own_links" ON public.parent_student_links;
CREATE POLICY "admissions_full_access" ON public.parent_student_links AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (("current_role"() = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));
CREATE POLICY "parent_read_own_links" ON public.parent_student_links AS PERMISSIVE FOR SELECT TO public
  USING ((parent_id = auth.uid()));

DROP POLICY IF EXISTS "parent_read_own_notifications" ON public.portal_notifications;
DROP POLICY IF EXISTS "super_admin_read_all_notifications" ON public.portal_notifications;
DROP POLICY IF EXISTS "parent_mark_own_notifications_read" ON public.portal_notifications;
CREATE POLICY "parent_read_own_notifications" ON public.portal_notifications AS PERMISSIVE FOR SELECT TO public
  USING ((parent_id = auth.uid()));
CREATE POLICY "super_admin_read_all_notifications" ON public.portal_notifications AS PERMISSIVE FOR SELECT TO public
  USING (("current_role"() = 'super_admin'::user_role));
CREATE POLICY "parent_mark_own_notifications_read" ON public.portal_notifications AS PERMISSIVE FOR UPDATE TO public
  USING ((parent_id = auth.uid()))
  WITH CHECK ((parent_id = auth.uid()));

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING ((auth.uid() = id));

DROP POLICY IF EXISTS "super_admin_manage_enrollments" ON public.student_subject_enrollments;
DROP POLICY IF EXISTS "marks_admin_read_enrollments" ON public.student_subject_enrollments;
DROP POLICY IF EXISTS "parent_read_linked_children_enrollments" ON public.student_subject_enrollments;
CREATE POLICY "super_admin_manage_enrollments" ON public.student_subject_enrollments AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'super_admin'::user_role))
  WITH CHECK (("current_role"() = 'super_admin'::user_role));
CREATE POLICY "marks_admin_read_enrollments" ON public.student_subject_enrollments AS PERMISSIVE FOR SELECT TO public
  USING (("current_role"() = 'marks_admin'::user_role));
CREATE POLICY "parent_read_linked_children_enrollments" ON public.student_subject_enrollments AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = student_subject_enrollments.student_id) AND (psl.parent_id = auth.uid())))));

DROP POLICY IF EXISTS "super_admin_manage_exclusions" ON public.student_subject_exclusions;
DROP POLICY IF EXISTS "marks_admin_read_exclusions" ON public.student_subject_exclusions;
DROP POLICY IF EXISTS "parent_read_linked_children_exclusions" ON public.student_subject_exclusions;
CREATE POLICY "super_admin_manage_exclusions" ON public.student_subject_exclusions AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'super_admin'::user_role))
  WITH CHECK (("current_role"() = 'super_admin'::user_role));
CREATE POLICY "marks_admin_read_exclusions" ON public.student_subject_exclusions AS PERMISSIVE FOR SELECT TO public
  USING (("current_role"() = 'marks_admin'::user_role));
CREATE POLICY "parent_read_linked_children_exclusions" ON public.student_subject_exclusions AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = student_subject_exclusions.student_id) AND (psl.parent_id = auth.uid())))));

DROP POLICY IF EXISTS "admissions_full_access" ON public.students;
DROP POLICY IF EXISTS "parent_read_linked_children" ON public.students;
DROP POLICY IF EXISTS "staff_read_access" ON public.students;
CREATE POLICY "admissions_full_access" ON public.students AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (("current_role"() = ANY (ARRAY['admissions_admin'::user_role, 'super_admin'::user_role])));
CREATE POLICY "parent_read_linked_children" ON public.students AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = students.id) AND (psl.parent_id = auth.uid())))));
CREATE POLICY "staff_read_access" ON public.students AS PERMISSIVE FOR SELECT TO public
  USING (("current_role"() = ANY (ARRAY['attendance_admin'::user_role, 'marks_admin'::user_role])));

DROP POLICY IF EXISTS "staff_manage_subjects" ON public.subjects;
DROP POLICY IF EXISTS "parent_read_linked_children_subjects" ON public.subjects;
DROP POLICY IF EXISTS "staff_read_subjects" ON public.subjects;
CREATE POLICY "staff_manage_subjects" ON public.subjects AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = ANY (ARRAY['super_admin'::user_role, 'marks_admin'::user_role])))
  WITH CHECK (("current_role"() = ANY (ARRAY['super_admin'::user_role, 'marks_admin'::user_role])));
CREATE POLICY "parent_read_linked_children_subjects" ON public.subjects AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (parent_student_links psl
     JOIN students s ON ((s.id = psl.student_id)))
  WHERE ((psl.parent_id = auth.uid()) AND (s.grade_level = subjects.grade_level)))));
CREATE POLICY "staff_read_subjects" ON public.subjects AS PERMISSIVE FOR SELECT TO public
  USING (("current_role"() = ANY (ARRAY['super_admin'::user_role, 'admissions_admin'::user_role, 'attendance_admin'::user_role, 'marks_admin'::user_role])));

DROP POLICY IF EXISTS "super_admin_full_access" ON public.teachers;
CREATE POLICY "super_admin_full_access" ON public.teachers AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'super_admin'::user_role))
  WITH CHECK (("current_role"() = 'super_admin'::user_role));

DROP POLICY IF EXISTS "marks_staff_manage_tests" ON public.tests;
DROP POLICY IF EXISTS "parent_read_linked_children_tests" ON public.tests;
CREATE POLICY "marks_staff_manage_tests" ON public.tests AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])))
  WITH CHECK (("current_role"() = ANY (ARRAY['marks_admin'::user_role, 'super_admin'::user_role])));
CREATE POLICY "parent_read_linked_children_tests" ON public.tests AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM (parent_student_links psl
     JOIN students s ON ((s.id = psl.student_id)))
  WHERE ((psl.parent_id = auth.uid()) AND (s.grade_level = tests.grade_level) AND (s.section = tests.section)))));

DROP POLICY IF EXISTS "super_admin_manage" ON public.video_lectures;
DROP POLICY IF EXISTS "authenticated_read" ON public.video_lectures;
CREATE POLICY "super_admin_manage" ON public.video_lectures AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'super_admin'::user_role))
  WITH CHECK (("current_role"() = 'super_admin'::user_role));
CREATE POLICY "authenticated_read" ON public.video_lectures AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "super_admin_manage_watch_sessions" ON public.video_watch_sessions;
DROP POLICY IF EXISTS "parent_insert_linked_children_watch_sessions" ON public.video_watch_sessions;
DROP POLICY IF EXISTS "parent_read_linked_children_watch_sessions" ON public.video_watch_sessions;
DROP POLICY IF EXISTS "parent_update_linked_children_watch_sessions" ON public.video_watch_sessions;
CREATE POLICY "super_admin_manage_watch_sessions" ON public.video_watch_sessions AS PERMISSIVE FOR ALL TO public
  USING (("current_role"() = 'super_admin'::user_role))
  WITH CHECK (("current_role"() = 'super_admin'::user_role));
CREATE POLICY "parent_insert_linked_children_watch_sessions" ON public.video_watch_sessions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = video_watch_sessions.student_id) AND (psl.parent_id = auth.uid())))));
CREATE POLICY "parent_read_linked_children_watch_sessions" ON public.video_watch_sessions AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = video_watch_sessions.student_id) AND (psl.parent_id = auth.uid())))));
CREATE POLICY "parent_update_linked_children_watch_sessions" ON public.video_watch_sessions AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = video_watch_sessions.student_id) AND (psl.parent_id = auth.uid())))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM parent_student_links psl
  WHERE ((psl.student_id = video_watch_sessions.student_id) AND (psl.parent_id = auth.uid())))));

