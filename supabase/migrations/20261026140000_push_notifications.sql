-- Rollback: supabase/rollbacks/20261026140000_push_notifications_rollback.sql

-- Real phone push notifications for parents. Every row written to
-- portal_notifications (the absence trigger, grade notices, a manual resend) is
-- also pushed to that parent's registered phones.
--
--   1. push_tokens         one row per phone (Expo push token) per parent account.
--   2. register_push_token / unregister_push_token
--                          the only way the app writes tokens. SECURITY DEFINER so
--                          a token moves to the new account when two parents share
--                          one phone (the unique token would otherwise block it).
--   3. trigger on portal_notifications
--                          after an insert, tells the web app (Vercel route
--                          /api/push/notify) via pg_net, which sends the push.
--
-- The webhook URL and shared secret live in Supabase Vault (never in this file).
-- Until both exist the trigger does nothing — see the setup SQL in the PR notes.
-- Like the absence trigger, a failure here is only a WARNING: it must never block
-- or roll back the notification / attendance write (CLAUDE.md §7).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.push_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  platform    text NOT NULL DEFAULT 'android',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_push_tokens_user ON public.push_tokens(user_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- A person can see their own registered phones. All writes go through the
-- functions below (and the server's service role), so there is no write policy.
CREATE POLICY "push_tokens_select_own"
  ON public.push_tokens FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE INSERT, UPDATE, DELETE ON public.push_tokens FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.register_push_token(p_token text, p_platform text DEFAULT 'android')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF p_token IS NULL OR length(p_token) < 10 OR length(p_token) > 300 THEN
    RAISE EXCEPTION 'invalid token';
  END IF;
  INSERT INTO public.push_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, COALESCE(NULLIF(p_platform, ''), 'android'))
  ON CONFLICT (token) DO UPDATE
    SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.push_tokens WHERE token = p_token AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.register_push_token(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unregister_push_token(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_push_on_portal_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_url    text;
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_url    FROM vault.decrypted_secrets WHERE name = 'push_webhook_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN
    RETURN NEW; -- not configured yet: in-app inbox only
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := jsonb_build_object('notificationId', NEW.id),
    timeout_milliseconds := 3000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'push webhook failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_push_on_portal_notification() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_push_on_portal_notification
  AFTER INSERT ON public.portal_notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_portal_notification();
