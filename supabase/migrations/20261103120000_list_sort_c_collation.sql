-- Rollback: supabase/rollbacks/20261103120000_list_sort_c_collation_rollback.sql

-- list_sort / roll_sort are machine keys (zero-padded digits, '~' separators).
-- Under the database's default locale collation, punctuation and spaces are
-- ignored at the first comparison level, so students came out in the wrong GR
-- order (e.g. "FD 619" ahead of "FD 632" being shuffled). The "C" collation
-- compares bytes, which is exactly what these keys are designed for.
ALTER TABLE public.students ALTER COLUMN list_sort TYPE text COLLATE "C";
ALTER TABLE public.students ALTER COLUMN roll_sort TYPE text COLLATE "C";
