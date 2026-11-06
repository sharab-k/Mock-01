DROP FUNCTION IF EXISTS public.expense_breakdown(date, date, uuid);
DROP FUNCTION IF EXISTS public.finance_by_period(date, date, text);
DROP FUNCTION IF EXISTS public.finance_totals(date, date);
DROP TABLE IF EXISTS public.expenses;
DROP FUNCTION IF EXISTS public.expenses_immutable();
DROP TABLE IF EXISTS public.expense_heads;
