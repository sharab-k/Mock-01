-- Rollback: supabase/rollbacks/20261107100000_expenses_rollback.sql

-- Expenses: what the academy paid out, grouped by head. Super Admin only.
-- Like fee receipts, an expense is never edited or deleted — a mistake is voided.

CREATE TABLE public.expense_heads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 60),
  is_active  boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.expense_heads (name) VALUES
  ('Utilities'), ('Salaries'), ('Stationery'), ('Maintenance'), ('Food'), ('Refund'), ('Other');

CREATE TABLE public.expenses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_no  bigint GENERATED ALWAYS AS IDENTITY,
  head_id     uuid NOT NULL REFERENCES public.expense_heads(id) ON DELETE RESTRICT,
  payee       text NOT NULL CHECK (char_length(payee) BETWEEN 1 AND 120),
  description text CHECK (description IS NULL OR char_length(description) <= 300),
  amount      numeric(10,2) NOT NULL CHECK (amount > 0),
  spent_on    date NOT NULL DEFAULT current_date,
  method      public.fee_method NOT NULL DEFAULT 'cash',
  reference   text CHECK (reference IS NULL OR char_length(reference) <= 100),
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  voided_at   timestamptz,
  voided_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  void_reason text CHECK (void_reason IS NULL OR char_length(void_reason) <= 300),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_expenses_no ON public.expenses (expense_no);
CREATE INDEX idx_expenses_spent_on ON public.expenses (spent_on);
CREATE INDEX idx_expenses_head ON public.expenses (head_id);
CREATE INDEX idx_expenses_created_by ON public.expenses (created_by);

CREATE FUNCTION public.expenses_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.head_id IS DISTINCT FROM OLD.head_id OR NEW.payee IS DISTINCT FROM OLD.payee
     OR NEW.amount IS DISTINCT FROM OLD.amount OR NEW.spent_on IS DISTINCT FROM OLD.spent_on
     OR NEW.method IS DISTINCT FROM OLD.method OR NEW.expense_no IS DISTINCT FROM OLD.expense_no THEN
    RAISE EXCEPTION 'An expense cannot be edited; void it and record a new one';
  END IF;
  IF OLD.voided_at IS NOT NULL AND NEW.voided_at IS NULL THEN
    RAISE EXCEPTION 'A voided expense cannot be restored';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_expenses_immutable BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.expenses_immutable();

-- ── Totals in SQL (never summed in JS — CLAUDE.md rule 10) ───────────────
-- Income, expenses, net and total outstanding for a date range.
CREATE FUNCTION public.finance_totals(p_from date, p_to date)
RETURNS TABLE (income numeric, expenses numeric, net numeric, outstanding numeric, receipt_count bigint, expense_count bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH i AS (SELECT COALESCE(sum(amount), 0) AS v, count(*) AS n FROM public.fee_receipts WHERE voided_at IS NULL AND paid_on BETWEEN p_from AND p_to),
       e AS (SELECT COALESCE(sum(amount), 0) AS v, count(*) AS n FROM public.expenses WHERE voided_at IS NULL AND spent_on BETWEEN p_from AND p_to),
       o AS (SELECT COALESCE(sum(outstanding), 0) AS v FROM public.fee_charge_balances)
  SELECT i.v, e.v, i.v - e.v, o.v, i.n, e.n FROM i, e, o;
$$;

-- Income and expenses per day / month / year across a range (for the daily, monthly
-- and yearly reports). Periods with no activity are simply absent.
CREATE FUNCTION public.finance_by_period(p_from date, p_to date, p_unit text)
RETURNS TABLE (period date, income numeric, expenses numeric)
LANGUAGE sql STABLE SET search_path = public AS $$
  WITH inc AS (
    SELECT date_trunc(p_unit, paid_on)::date AS p, sum(amount) AS v
    FROM public.fee_receipts WHERE voided_at IS NULL AND paid_on BETWEEN p_from AND p_to GROUP BY 1),
  exp AS (
    SELECT date_trunc(p_unit, spent_on)::date AS p, sum(amount) AS v
    FROM public.expenses WHERE voided_at IS NULL AND spent_on BETWEEN p_from AND p_to GROUP BY 1)
  SELECT COALESCE(inc.p, exp.p), COALESCE(inc.v, 0), COALESCE(exp.v, 0)
  FROM inc FULL OUTER JOIN exp ON inc.p = exp.p
  WHERE p_unit IN ('day', 'month', 'year')
  ORDER BY 1;
$$;

-- Expense totals by head and by payee for the expense report generator.
CREATE FUNCTION public.expense_breakdown(p_from date, p_to date, p_head uuid)
RETURNS TABLE (kind text, label text, total numeric, n bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT 'head', h.name, sum(x.amount), count(*)
  FROM public.expenses x JOIN public.expense_heads h ON h.id = x.head_id
  WHERE x.voided_at IS NULL AND x.spent_on BETWEEN p_from AND p_to AND (p_head IS NULL OR x.head_id = p_head)
  GROUP BY h.name
  UNION ALL
  SELECT 'payee', x.payee, sum(x.amount), count(*)
  FROM public.expenses x
  WHERE x.voided_at IS NULL AND x.spent_on BETWEEN p_from AND p_to AND (p_head IS NULL OR x.head_id = p_head)
  GROUP BY x.payee
  UNION ALL
  SELECT 'day', x.spent_on::text, sum(x.amount), count(*)
  FROM public.expenses x
  WHERE x.voided_at IS NULL AND x.spent_on BETWEEN p_from AND p_to AND (p_head IS NULL OR x.head_id = p_head)
  GROUP BY x.spent_on
  ORDER BY 1, 3 DESC;
$$;

-- ── RLS: Super Admin only (no DELETE policy — void instead) ──────────────
ALTER TABLE public.expense_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_heads_select" ON public.expense_heads FOR SELECT TO authenticated USING ((SELECT public.current_role()) = 'super_admin');
CREATE POLICY "expense_heads_insert" ON public.expense_heads FOR INSERT TO authenticated WITH CHECK ((SELECT public.current_role()) = 'super_admin');
CREATE POLICY "expense_heads_update" ON public.expense_heads FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) = 'super_admin') WITH CHECK ((SELECT public.current_role()) = 'super_admin');

CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated USING ((SELECT public.current_role()) = 'super_admin');
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated WITH CHECK ((SELECT public.current_role()) = 'super_admin');
CREATE POLICY "expenses_update" ON public.expenses FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) = 'super_admin') WITH CHECK ((SELECT public.current_role()) = 'super_admin');

REVOKE EXECUTE ON FUNCTION public.finance_totals(date, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finance_by_period(date, date, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.expense_breakdown(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finance_totals(date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finance_by_period(date, date, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.expense_breakdown(date, date, uuid) TO authenticated;
