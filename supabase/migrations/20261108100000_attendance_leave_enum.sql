-- Rollback: supabase/rollbacks/20261108100000_attendance_leave_rollback.sql

-- A student on approved leave is neither present nor absent. Added on its own, because a new
-- enum value cannot be used in the same transaction that creates it — the functions that treat
-- it (excused, left out of attendance rates) follow in the next migration.
ALTER TYPE public.attendance_status ADD VALUE IF NOT EXISTS 'leave';
