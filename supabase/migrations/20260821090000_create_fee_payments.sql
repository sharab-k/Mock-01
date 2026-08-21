-- Rollback:
--   DROP TABLE IF EXISTS public.fee_payments;
--   DROP TYPE IF EXISTS public.fee_status;

-- Tracks whether a student's fee has been paid for a given calendar month,
-- marked by Super Admin only (per client decision — separate from
-- Admissions Admin's enrolment/record-editing scope). A row only exists
-- once a status has actually been set — we don't pre-populate 12 empty
-- rows per student per year; absence of a row for a (student, year, month)
-- means unpaid, which fetchFeeRoster() treats as the default.
CREATE TYPE public.fee_status AS ENUM ('paid', 'unpaid');

CREATE TABLE public.fee_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  year        int NOT NULL,
  month       int NOT NULL CHECK (month BETWEEN 1 AND 12),
  status      public.fee_status NOT NULL DEFAULT 'unpaid',
  marked_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, year, month)
);

CREATE INDEX idx_fee_payments_year_month ON public.fee_payments(year, month);

CREATE TRIGGER trg_fee_payments_updated_at
  BEFORE UPDATE ON public.fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Super Admin only, both read and write — no admissions_admin/staff access.
ALTER TABLE public.fee_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_full_access"
  ON public.fee_payments FOR ALL
  USING (public.current_role() = 'super_admin')
  WITH CHECK (public.current_role() = 'super_admin');
