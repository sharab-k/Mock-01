-- Rollback: supabase/rollbacks/20261111100000_student_card_group_rollback.sql

-- The group printed on a student's ID card. It must be chosen before the card can be printed or downloaded
-- (a parent picks it once; the Super Admin can change it at any time), so it starts empty. Classes 9 and 10 use
-- Biology / Engineering; classes 11, 12 and I.Com use Pre-Engineering / Pre-Medical / General Science / Commerce.
-- Which of those a student may take for their class is checked by the application; the database only keeps the
-- value to the known set. This is deliberately NOT the faculty (students.stream) that drives attendance subjects.
ALTER TABLE public.students
  ADD COLUMN card_group text
  CHECK (card_group IS NULL OR card_group IN ('Pre-Engineering', 'Pre-Medical', 'General Science', 'Commerce', 'Biology', 'Engineering'));
