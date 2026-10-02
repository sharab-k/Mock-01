-- Rollback: ALTER TABLE public.portal_notifications DROP COLUMN IF EXISTS parent_name;

-- Super Admin's "sent notifications" view needs to show who each alert went
-- to, but profiles RLS (select_own_profile only) deliberately lets no one read
-- another user's row. Rather than widen that, record the recipient's name on
-- the notification when it's sent — it's a sent log, so the name as of send
-- time is the right value anyway.
ALTER TABLE public.portal_notifications ADD COLUMN parent_name text NOT NULL DEFAULT '';

UPDATE public.portal_notifications n
SET parent_name = p.full_name
FROM public.profiles p
WHERE p.id = n.parent_id;
