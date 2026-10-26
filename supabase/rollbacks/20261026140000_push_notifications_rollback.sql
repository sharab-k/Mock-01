DROP TRIGGER IF EXISTS trg_push_on_portal_notification ON public.portal_notifications;
DROP FUNCTION IF EXISTS public.notify_push_on_portal_notification();
DROP FUNCTION IF EXISTS public.register_push_token(text, text);
DROP FUNCTION IF EXISTS public.unregister_push_token(text);
DROP TABLE IF EXISTS public.push_tokens;
-- (pg_net is left installed; drop it manually only if nothing else uses it.)
