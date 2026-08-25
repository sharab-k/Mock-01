-- Rollback:
--   DROP POLICY IF EXISTS "parent_read_linked_children" ON public.fee_payments;

-- fee_payments previously had only a super_admin_full_access policy — a
-- parent had no way to see their own child's fee status, even read-only.
-- Mirrors students' parent_read_linked_children policy exactly.
CREATE POLICY "parent_read_linked_children"
  ON public.fee_payments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.student_id = fee_payments.student_id AND psl.parent_id = auth.uid()
  ));
