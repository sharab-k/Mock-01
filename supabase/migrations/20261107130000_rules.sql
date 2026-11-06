-- Rollback: supabase/rollbacks/20261107130000_rules_rollback.sql

-- Rules and Regulations: pictures the administration uploads (with a title and an
-- optional description) and publishes for parents. Only the administration can
-- change them; everyone signed in can read what is published.
--
-- The pictures live in a PRIVATE bucket with no storage policy for anon or
-- authenticated: every read and write goes through a server route that checks who
-- is asking and uses the service role (same model as student photos).

CREATE TABLE public.rule_documents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  description  text CHECK (description IS NULL OR char_length(description) <= 2000),
  storage_path text NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_rule_documents_order ON public.rule_documents (is_published, sort_order);
CREATE INDEX idx_rule_documents_created_by ON public.rule_documents (created_by);
CREATE TRIGGER trg_rule_documents_updated_at BEFORE UPDATE ON public.rule_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- published_at is set the moment a picture is first published, and cleared on unpublish.
CREATE FUNCTION public.rule_documents_publish() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_published AND (TG_OP = 'INSERT' OR NOT OLD.is_published) THEN
    NEW.published_at := now();
  ELSIF NOT NEW.is_published THEN
    NEW.published_at := NULL;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_rule_documents_publish BEFORE INSERT OR UPDATE ON public.rule_documents
  FOR EACH ROW EXECUTE FUNCTION public.rule_documents_publish();

ALTER TABLE public.rule_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rule_documents_select" ON public.rule_documents FOR SELECT TO authenticated
  USING (is_published OR (SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));
CREATE POLICY "rule_documents_insert" ON public.rule_documents FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));
CREATE POLICY "rule_documents_update" ON public.rule_documents FOR UPDATE TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'))
  WITH CHECK ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));
CREATE POLICY "rule_documents_delete" ON public.rule_documents FOR DELETE TO authenticated
  USING ((SELECT public.current_role()) IN ('super_admin', 'admissions_admin'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('rules-images', 'rules-images', false, 6291456, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
