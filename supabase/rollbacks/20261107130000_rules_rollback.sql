DELETE FROM storage.objects WHERE bucket_id = 'rules-images';
DELETE FROM storage.buckets WHERE id = 'rules-images';
DROP TABLE IF EXISTS public.rule_documents;
DROP FUNCTION IF EXISTS public.rule_documents_publish();
