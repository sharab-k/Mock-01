-- Rollback:
--   ALTER TABLE public.students DROP COLUMN IF EXISTS roll_sort;
--   DROP FUNCTION IF EXISTS public.natural_sort_key(text);

-- Lists of students must come out in roll-number order. roll_number is text
-- (e.g. '9B1', '9B2', '9B10', '11A3'), so a plain ORDER BY gives
-- '9B1','9B10','9B11','9B2' and puts Grade 10 before Grade 9. natural_sort_key
-- zero-pads every digit run so text order equals natural order; students.roll_sort
-- is that key, kept in sync automatically (generated column), so every list
-- — web, mobile, any role — can just ORDER BY roll_sort.
CREATE OR REPLACE FUNCTION public.natural_sort_key(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    string_agg(
      CASE WHEN m[1] ~ '^[0-9]+$' THEN lpad(m[1], 10, '0') ELSE lower(m[1]) END,
      '' ORDER BY ord
    ),
    ''
  )
  FROM regexp_matches(t, '([0-9]+|[^0-9]+)', 'g') WITH ORDINALITY AS x(m, ord)
$$;

ALTER TABLE public.students
  ADD COLUMN roll_sort text GENERATED ALWAYS AS (public.natural_sort_key(roll_number)) STORED;

CREATE INDEX idx_students_roll_sort ON public.students(roll_sort);
