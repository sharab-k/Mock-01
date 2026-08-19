-- Rollback:
--   ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_gr_number_key;

-- gr_number was a free-text field the admissions admin copied from the
-- school's existing paper records — optional, since not every historical
-- student had one handy at enrolment. The client now wants it treated as a
-- real per-student office identifier: unique, and required for every new
-- enrolment (enforced in lib/actions/enrol-student.ts's Zod schema — the
-- form field itself is now `required`). We only add uniqueness here, not
-- NOT NULL: a UNIQUE constraint in Postgres permits any number of NULLs, so
-- existing students enrolled before this change (who may have no gr_number
-- on file) are left untouched rather than requiring a backfill.
--
-- NOTE: if any existing rows already share a duplicate gr_number value,
-- this ALTER will fail — deduplicate those rows first, then re-run.
ALTER TABLE public.students
  ADD CONSTRAINT students_gr_number_key UNIQUE (gr_number);
