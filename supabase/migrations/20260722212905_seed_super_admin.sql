-- Rollback: DELETE FROM public.profiles WHERE id = '176e155b-4429-4e7e-b864-beee7d413488';

-- Seeds the single Super Admin profile row for the auth.users account created
-- directly via the Supabase dashboard (Authentication → Users → Add user).
-- This is the only super_admin row that should ever exist without going
-- through a later phase's "create sub-admin" Server Action — there is no app
-- code path that creates a super_admin, by design (CLAUDE.md §2).
-- Email is pulled from the existing auth.users row rather than retyped here,
-- so it can't drift from what was actually entered in the dashboard.
INSERT INTO public.profiles (id, role, full_name, email)
SELECT id, 'super_admin', 'Super-admin-s', email
FROM auth.users
WHERE id = '176e155b-4429-4e7e-b864-beee7d413488'
ON CONFLICT (id) DO NOTHING;
