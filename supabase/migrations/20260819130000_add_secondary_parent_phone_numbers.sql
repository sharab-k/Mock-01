-- Rollback:
--   ALTER TABLE public.profiles DROP COLUMN secondary_phone, DROP COLUMN whatsapp_number_2;

-- The enrolment form previously had a single "WhatsApp / Phone" field
-- (profiles.phone). The client wants three separate contact numbers
-- captured per parent: a primary WhatsApp number (phone, unchanged —
-- already used for login lookup, sibling matching, and the notification
-- pipeline), a plain phone number, and a second WhatsApp number (e.g. for a
-- second guardian). Both new columns are optional — only the primary
-- WhatsApp number (phone) is required at enrolment, same as before.
ALTER TABLE public.profiles
  ADD COLUMN secondary_phone    text,
  ADD COLUMN whatsapp_number_2  text;
