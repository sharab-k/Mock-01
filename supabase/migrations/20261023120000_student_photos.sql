-- Rollback:
--   ALTER TABLE public.students DROP COLUMN IF EXISTS photo_path, DROP COLUMN IF EXISTS photo_updated_at, DROP COLUMN IF EXISTS photo_updated_by;
--   DELETE FROM storage.objects WHERE bucket_id = 'student-photos';
--   DELETE FROM storage.buckets WHERE id = 'student-photos';

-- Student ID-card photos.
--
-- The photo itself lives in a PRIVATE storage bucket: there is deliberately no
-- storage policy for anon or authenticated, so nobody can list or fetch an
-- object directly. Every read and write goes through a server route that has
-- already checked who is asking (the student's linked parent, or a Super Admin)
-- and uses the service role. A child's photo is never a public URL.
--
-- "A parent may upload once; only the Super Admin can change it" is enforced
-- in that route with a conditional update (photo_path IS NULL) so two parallel
-- uploads cannot both win.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS photo_path text,
  ADD COLUMN IF NOT EXISTS photo_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('student-photos', 'student-photos', false, 1048576, ARRAY['image/jpeg'])
ON CONFLICT (id) DO NOTHING;
