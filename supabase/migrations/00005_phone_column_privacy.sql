-- Phone column privacy.
--
-- Migration 00002 granted row-level SELECT on ALL columns of public.users to
-- every authenticated role — including anonymous sessions. Anyone holding the
-- anon key could enumerate full phone numbers through PostgREST.
--
-- Revoke column-level SELECT on `phone` from anon/authenticated. The app only
-- ever reads display_name from the client; phone is read server-side via the
-- service role (which bypasses grants) and is masked to its last 4 digits
-- before it leaves the server.

REVOKE SELECT (phone) ON public.users FROM anon;
REVOKE SELECT (phone) ON public.users FROM authenticated;

-- Re-assert the columns that clients ARE allowed to read, so future
-- table-level grants don't silently re-expose phone.
GRANT SELECT (id, display_name, avatar_url, created_at) ON public.users TO anon;
GRANT SELECT (id, display_name, avatar_url, created_at) ON public.users TO authenticated;
