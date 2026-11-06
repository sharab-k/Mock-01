-- Rollback: supabase/rollbacks/20261106140000_fees_core_rollback.sql

-- Fees core: fee heads, per-student charges, payment receipts, and a balance
-- view. Super Admin only writes; parents read their own children's rows.
-- Receipts and charges are never deleted — a mistake is voided (kept, with who
-- and why), because financial records must not be silently changed.
--
-- The old monthly paid/unpaid table (fee_payments) stays: the mobile app, the
-- parent dashboard and the progress report still read it. A trigger keeps it in
-- step with the new ledger so they keep working unchanged.

-- ── Types ────────────────────────────────────────────────────────────────
CREATE TYPE public.fee_method AS ENUM ('cash', 'bank_transfer', 'cheque', 'online', 'other');

-- ── fee_heads ────────────────────────────────────────────────────────────
CREATE TABLE public.fee_heads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 60),
  is_monthly     boolean NOT NULL DEFAULT false,
  default_amount numeric(10,2) CHECK (default_amount IS NULL OR default_amount >= 0),
  is_active      boolean NOT NULL DEFAULT true,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_fee_heads_updated_at BEFORE UPDATE ON public.fee_heads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.fee_heads (name, is_monthly, sort_order) VALUES
  ('Tuition',      true,  1),
  ('Admission',    false, 2),
  ('Registration', false, 3),
  ('Examination',  false, 4),
  ('Other',        false, 5);

-- Per-student monthly discount, applied when monthly charges are generated.
ALTER TABLE public.students
  ADD COLUMN monthly_discount numeric(10,2) NOT NULL DEFAULT 0 CHECK (monthly_discount >= 0);

-- ── fee_charges (what a student owes) ────────────────────────────────────
CREATE TABLE public.fee_charges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  head_id     uuid NOT NULL REFERENCES public.fee_heads(id) ON DELETE RESTRICT,
  year        int NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  month       int CHECK (month BETWEEN 1 AND 12),          -- NULL for one-off heads
  amount      numeric(10,2) NOT NULL CHECK (amount >= 0),
  discount    numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  due_date    date,
  note        text CHECK (note IS NULL OR char_length(note) <= 300),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  voided_at   timestamptz,
  voided_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (discount <= amount)
);
-- One live charge per student per head per month (monthly heads).
CREATE UNIQUE INDEX uq_fee_charges_monthly
  ON public.fee_charges (student_id, head_id, year, month)
  WHERE month IS NOT NULL AND voided_at IS NULL;
CREATE INDEX idx_fee_charges_student ON public.fee_charges (student_id);
CREATE INDEX idx_fee_charges_head ON public.fee_charges (head_id);
CREATE INDEX idx_fee_charges_period ON public.fee_charges (year, month);
CREATE TRIGGER trg_fee_charges_updated_at BEFORE UPDATE ON public.fee_charges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── fee_receipts (money received) ────────────────────────────────────────
CREATE TABLE public.fee_receipts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_no   bigint GENERATED ALWAYS AS IDENTITY,
  student_id   uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  charge_id    uuid NOT NULL REFERENCES public.fee_charges(id) ON DELETE RESTRICT,
  amount       numeric(10,2) NOT NULL CHECK (amount > 0),
  paid_on      date NOT NULL DEFAULT current_date,
  method       public.fee_method NOT NULL DEFAULT 'cash',
  reference    text CHECK (reference IS NULL OR char_length(reference) <= 100),
  note         text CHECK (note IS NULL OR char_length(note) <= 300),
  received_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  voided_at    timestamptz,
  voided_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  void_reason  text CHECK (void_reason IS NULL OR char_length(void_reason) <= 300),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_fee_receipts_no ON public.fee_receipts (receipt_no);
CREATE INDEX idx_fee_receipts_student ON public.fee_receipts (student_id);
CREATE INDEX idx_fee_receipts_charge ON public.fee_receipts (charge_id);
CREATE INDEX idx_fee_receipts_paid_on ON public.fee_receipts (paid_on);

-- A receipt's money fields can never be edited — only voided.
CREATE FUNCTION public.fee_receipts_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.charge_id IS DISTINCT FROM OLD.charge_id
     OR NEW.amount IS DISTINCT FROM OLD.amount
     OR NEW.paid_on IS DISTINCT FROM OLD.paid_on
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.receipt_no IS DISTINCT FROM OLD.receipt_no THEN
    RAISE EXCEPTION 'A receipt cannot be edited; void it and record a new one';
  END IF;
  IF OLD.voided_at IS NOT NULL AND NEW.voided_at IS NULL THEN
    RAISE EXCEPTION 'A voided receipt cannot be restored';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fee_receipts_immutable BEFORE UPDATE ON public.fee_receipts
  FOR EACH ROW EXECUTE FUNCTION public.fee_receipts_immutable();

-- A receipt must belong to the same student as its charge.
CREATE FUNCTION public.fee_receipts_check_student() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.fee_charges c WHERE c.id = NEW.charge_id AND c.student_id = NEW.student_id AND c.voided_at IS NULL) THEN
    RAISE EXCEPTION 'Receipt does not match an open charge for this student';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_fee_receipts_check_student BEFORE INSERT ON public.fee_receipts
  FOR EACH ROW EXECUTE FUNCTION public.fee_receipts_check_student();

-- ── Balance view (RLS of the caller applies) ─────────────────────────────
CREATE VIEW public.fee_charge_balances WITH (security_invoker = true) AS
SELECT
  c.id AS charge_id, c.student_id, c.head_id, c.year, c.month, c.due_date, c.note,
  c.amount, c.discount,
  (c.amount - c.discount) AS due,
  COALESCE(r.paid, 0)     AS paid,
  GREATEST((c.amount - c.discount) - COALESCE(r.paid, 0), 0) AS outstanding,
  CASE
    WHEN (c.amount - c.discount) = 0 OR COALESCE(r.paid, 0) >= (c.amount - c.discount) THEN 'paid'
    WHEN c.due_date IS NOT NULL AND c.due_date < current_date THEN 'overdue'
    WHEN COALESCE(r.paid, 0) > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS status
FROM public.fee_charges c
LEFT JOIN LATERAL (
  SELECT sum(fr.amount) AS paid FROM public.fee_receipts fr
  WHERE fr.charge_id = c.id AND fr.voided_at IS NULL
) r ON true
WHERE c.voided_at IS NULL;

-- ── Keep the old monthly paid/unpaid table in step ───────────────────────
-- SECURITY DEFINER because a parent-visible table is written by a Super Admin
-- action; the function only ever touches fee_payments for the one student/month.
CREATE FUNCTION public.fee_sync_monthly_status(p_charge uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c public.fee_charges%ROWTYPE;
  v_paid numeric;
  v_status public.fee_status;
BEGIN
  SELECT * INTO c FROM public.fee_charges WHERE id = p_charge;
  IF NOT FOUND OR c.month IS NULL OR c.voided_at IS NOT NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.fee_heads h WHERE h.id = c.head_id AND h.is_monthly) THEN RETURN; END IF;
  SELECT COALESCE(sum(amount), 0) INTO v_paid FROM public.fee_receipts WHERE charge_id = p_charge AND voided_at IS NULL;
  v_status := CASE WHEN (c.amount - c.discount) = 0 OR v_paid >= (c.amount - c.discount) THEN 'paid' ELSE 'unpaid' END;
  INSERT INTO public.fee_payments (student_id, year, month, status, marked_by)
  VALUES (c.student_id, c.year, c.month, v_status, auth.uid())
  ON CONFLICT (student_id, year, month) DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by;
END $$;
REVOKE ALL ON FUNCTION public.fee_sync_monthly_status(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.fee_receipts_sync() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.fee_sync_monthly_status(COALESCE(NEW.charge_id, OLD.charge_id));
  RETURN NULL;
END $$;
CREATE TRIGGER trg_fee_receipts_sync AFTER INSERT OR UPDATE ON public.fee_receipts
  FOR EACH ROW EXECUTE FUNCTION public.fee_receipts_sync();

CREATE FUNCTION public.fee_charges_sync() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM public.fee_sync_monthly_status(NEW.id);
  RETURN NULL;
END $$;
CREATE TRIGGER trg_fee_charges_sync AFTER INSERT OR UPDATE ON public.fee_charges
  FOR EACH ROW EXECUTE FUNCTION public.fee_charges_sync();

-- ── Convert existing "paid" months into charge + receipt (history carries over)
-- The student's current tuition_fee less discount is used as the amount; a
-- student with no fee set gets a zero charge and no receipt.
INSERT INTO public.fee_charges (student_id, head_id, year, month, amount, due_date, note, created_by)
SELECT fp.student_id, (SELECT id FROM public.fee_heads WHERE name = 'Tuition'), fp.year, fp.month,
       COALESCE(s.tuition_fee, 0), make_date(fp.year, fp.month, 10),
       'Converted from monthly paid flag', fp.marked_by
FROM public.fee_payments fp JOIN public.students s ON s.id = fp.student_id
WHERE fp.status = 'paid';

INSERT INTO public.fee_receipts (student_id, charge_id, amount, paid_on, method, note, received_by)
SELECT c.student_id, c.id, c.amount, fp.updated_at::date, 'cash', 'Converted from monthly paid flag', c.created_by
FROM public.fee_charges c
JOIN public.fee_payments fp ON fp.student_id = c.student_id AND fp.year = c.year AND fp.month = c.month
WHERE c.note = 'Converted from monthly paid flag' AND c.amount > 0;

-- ── Overview numbers (counted in SQL, never summed in JS — CLAUDE.md rule 10)
CREATE FUNCTION public.fee_overview(p_from date, p_to date)
RETURNS TABLE (collected numeric, receipt_count bigint, outstanding numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT
    COALESCE((SELECT sum(amount) FROM public.fee_receipts WHERE voided_at IS NULL AND paid_on BETWEEN p_from AND p_to), 0),
    (SELECT count(*) FROM public.fee_receipts WHERE voided_at IS NULL AND paid_on BETWEEN p_from AND p_to),
    COALESCE((SELECT sum(outstanding) FROM public.fee_charge_balances), 0);
$$;

-- Generate the monthly Tuition charge for every active student who has a fee set.
-- Skips students who already have one for that month. Returns how many were made.
CREATE FUNCTION public.fee_generate_monthly_charges(p_year int, p_month int, p_due date)
RETURNS int LANGUAGE plpgsql SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF (SELECT public.current_role()) IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  INSERT INTO public.fee_charges (student_id, head_id, year, month, amount, discount, due_date, created_by)
  SELECT s.id, h.id, p_year, p_month, s.tuition_fee, LEAST(s.monthly_discount, s.tuition_fee), p_due, auth.uid()
  FROM public.students s CROSS JOIN (SELECT id FROM public.fee_heads WHERE name = 'Tuition') h
  WHERE s.deleted_at IS NULL AND s.status = 'active' AND s.tuition_fee IS NOT NULL AND s.tuition_fee > 0
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.fee_heads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_charges  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_receipts ENABLE ROW LEVEL SECURITY;

-- Heads: names are not sensitive; any signed-in user may read, only Super Admin writes.
CREATE POLICY "fee_heads_select" ON public.fee_heads FOR SELECT TO authenticated USING (true);
CREATE POLICY "fee_heads_insert" ON public.fee_heads FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_role()) = 'super_admin');
CREATE POLICY "fee_heads_update" ON public.fee_heads FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) = 'super_admin')
  WITH CHECK ((SELECT public.current_role()) = 'super_admin');

-- Charges and receipts: Super Admin read/insert/update (no DELETE policy — void instead);
-- a parent reads only live rows of their own linked children.
CREATE POLICY "fee_charges_select" ON public.fee_charges FOR SELECT TO authenticated
  USING (
    (SELECT public.current_role()) = 'super_admin'
    OR (voided_at IS NULL AND EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = fee_charges.student_id AND psl.parent_id = (SELECT auth.uid())))
  );
CREATE POLICY "fee_charges_insert" ON public.fee_charges FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_role()) = 'super_admin');
CREATE POLICY "fee_charges_update" ON public.fee_charges FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) = 'super_admin')
  WITH CHECK ((SELECT public.current_role()) = 'super_admin');

CREATE POLICY "fee_receipts_select" ON public.fee_receipts FOR SELECT TO authenticated
  USING (
    (SELECT public.current_role()) = 'super_admin'
    OR (voided_at IS NULL AND EXISTS (
      SELECT 1 FROM public.parent_student_links psl
      WHERE psl.student_id = fee_receipts.student_id AND psl.parent_id = (SELECT auth.uid())))
  );
CREATE POLICY "fee_receipts_insert" ON public.fee_receipts FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_role()) = 'super_admin');
CREATE POLICY "fee_receipts_update" ON public.fee_receipts FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) = 'super_admin')
  WITH CHECK ((SELECT public.current_role()) = 'super_admin');

-- The balance view and functions run as the caller; revoke from anon.
REVOKE ALL ON public.fee_charge_balances FROM anon;
REVOKE EXECUTE ON FUNCTION public.fee_overview(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fee_generate_monthly_charges(int, int, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fee_overview(date, date) TO authenticated;
GRANT  EXECUTE ON FUNCTION public.fee_generate_monthly_charges(int, int, date) TO authenticated;
