-- Rollback: ALTER TABLE public.profiles DROP COLUMN is_active;

-- Backs the Super Admin "Deactivate / Reactivate" staff action (Phase 9).
-- Defaults true so every existing row (including the seeded super_admin)
-- stays active without a backfill step.
ALTER TABLE public.profiles ADD COLUMN is_active boolean NOT NULL DEFAULT true;
