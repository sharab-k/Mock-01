-- Rolls back 20261106140000_fees_core.sql. The old fee_payments table is untouched,
-- so the monthly paid/unpaid view keeps working. Ledger data (charges, receipts) is lost.
DROP FUNCTION IF EXISTS public.fee_generate_monthly_charges(int, int, date);
DROP FUNCTION IF EXISTS public.fee_overview(date, date);
DROP VIEW IF EXISTS public.fee_charge_balances;
DROP TABLE IF EXISTS public.fee_receipts;
DROP TABLE IF EXISTS public.fee_charges;
DROP FUNCTION IF EXISTS public.fee_receipts_sync();
DROP FUNCTION IF EXISTS public.fee_charges_sync();
DROP FUNCTION IF EXISTS public.fee_sync_monthly_status(uuid);
DROP FUNCTION IF EXISTS public.fee_receipts_immutable();
DROP FUNCTION IF EXISTS public.fee_receipts_check_student();
ALTER TABLE public.students DROP COLUMN IF EXISTS monthly_discount;
DROP TABLE IF EXISTS public.fee_heads;
DROP TYPE IF EXISTS public.fee_method;
