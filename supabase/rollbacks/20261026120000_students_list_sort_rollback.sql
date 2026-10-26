DROP INDEX IF EXISTS public.idx_students_list_sort;
ALTER TABLE public.students DROP COLUMN IF EXISTS list_sort;
