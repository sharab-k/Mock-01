-- Rollback: DROP TABLE IF EXISTS public.parent_credentials;

-- Recoverable copy of each parent's portal password, so Super Admin can look it
-- up and hand it to a family (explicitly requested by the school). Supabase Auth
-- keeps only a one-way hash, so this is the ONLY place a password can be read
-- back from. It stores an AES-256-GCM ciphertext (the key lives in the server
-- env as CREDENTIAL_ENCRYPTION_KEY, never in the database), not the password.
--
-- RLS is enabled with deliberately NO policies: no role — not even Super Admin's
-- own JWT — can select/insert/update it directly. Only the server's service-role
-- client touches this table, and only through lib/auth/credential-vault.ts,
-- which is called by (a) the actions that set a parent's password and (b) the
-- Super-Admin-only reveal action, which audit-logs every view.
CREATE TABLE public.parent_credentials (
  parent_id    uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  password_enc text NOT NULL,
  set_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.parent_credentials ENABLE ROW LEVEL SECURITY;
