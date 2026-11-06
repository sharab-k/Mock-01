-- Rollback: supabase/rollbacks/20261107110000_vouchers_rollback.sql

-- Fee vouchers: one printable voucher per student per month. The voucher row records
-- that it was generated (and when / for how much); its payment status is DERIVED from
-- the month's charges and receipts, so it can never disagree with the ledger.

CREATE TABLE public.fee_vouchers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no   bigint GENERATED ALWAYS AS IDENTITY,
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  year         int NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  month        int NOT NULL CHECK (month BETWEEN 1 AND 12),
  due_date     date NOT NULL,
  amount       numeric(10,2) NOT NULL CHECK (amount >= 0),   -- total due when generated
  generated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, year, month)
);
CREATE UNIQUE INDEX uq_fee_vouchers_no ON public.fee_vouchers (voucher_no);
CREATE INDEX idx_fee_vouchers_period ON public.fee_vouchers (year, month);
CREATE INDEX idx_fee_vouchers_generated_by ON public.fee_vouchers (generated_by);

CREATE VIEW public.fee_voucher_status WITH (security_invoker = true) AS
SELECT
  v.id, v.voucher_no, v.student_id, v.year, v.month, v.due_date, v.generated_at, v.amount AS generated_amount,
  COALESCE(b.due, 0)         AS due,
  COALESCE(b.paid, 0)        AS paid,
  COALESCE(b.outstanding, 0) AS outstanding,
  CASE
    WHEN COALESCE(b.outstanding, 0) = 0 THEN 'paid'
    WHEN v.due_date < current_date THEN 'overdue'
    WHEN COALESCE(b.paid, 0) > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS status
FROM public.fee_vouchers v
LEFT JOIN LATERAL (
  SELECT sum(cb.due) AS due, sum(cb.paid) AS paid, sum(cb.outstanding) AS outstanding
  FROM public.fee_charge_balances cb
  WHERE cb.student_id = v.student_id AND cb.year = v.year AND cb.month = v.month
) b ON true;

-- Generates (or refreshes) vouchers for the chosen students. Students who have left
-- (inactive) or are deleted are skipped automatically. A student with no Tuition
-- charge for the month but a monthly fee set gets one first. Returns the vouchers made.
CREATE FUNCTION public.fee_generate_vouchers(p_year int, p_month int, p_due date, p_student_ids uuid[])
RETURNS int LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF (SELECT public.current_role()) IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO public.fee_charges (student_id, head_id, year, month, amount, discount, due_date, created_by)
  SELECT s.id, h.id, p_year, p_month, s.tuition_fee, LEAST(s.monthly_discount, s.tuition_fee), p_due, auth.uid()
  FROM public.students s CROSS JOIN (SELECT id FROM public.fee_heads WHERE name = 'Tuition') h
  WHERE s.id = ANY (p_student_ids) AND s.deleted_at IS NULL AND s.status = 'active'
    AND s.tuition_fee IS NOT NULL AND s.tuition_fee > 0
  ON CONFLICT DO NOTHING;

  INSERT INTO public.fee_vouchers (student_id, year, month, due_date, amount, generated_by)
  SELECT s.id, p_year, p_month, p_due,
         COALESCE((SELECT sum(cb.due) FROM public.fee_charge_balances cb WHERE cb.student_id = s.id AND cb.year = p_year AND cb.month = p_month), 0),
         auth.uid()
  FROM public.students s
  WHERE s.id = ANY (p_student_ids) AND s.deleted_at IS NULL AND s.status = 'active'
  ON CONFLICT (student_id, year, month)
  DO UPDATE SET due_date = EXCLUDED.due_date, amount = EXCLUDED.amount, generated_by = EXCLUDED.generated_by, generated_at = now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

ALTER TABLE public.fee_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_vouchers_select" ON public.fee_vouchers FOR SELECT TO authenticated
  USING (
    (SELECT public.current_role()) = 'super_admin'
    OR EXISTS (SELECT 1 FROM public.parent_student_links psl WHERE psl.student_id = fee_vouchers.student_id AND psl.parent_id = (SELECT auth.uid()))
  );
CREATE POLICY "fee_vouchers_insert" ON public.fee_vouchers FOR INSERT TO authenticated WITH CHECK ((SELECT public.current_role()) = 'super_admin');
CREATE POLICY "fee_vouchers_update" ON public.fee_vouchers FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) = 'super_admin') WITH CHECK ((SELECT public.current_role()) = 'super_admin');

REVOKE ALL ON public.fee_voucher_status FROM anon;
REVOKE EXECUTE ON FUNCTION public.fee_generate_vouchers(int, int, date, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fee_generate_vouchers(int, int, date, uuid[]) TO authenticated;
