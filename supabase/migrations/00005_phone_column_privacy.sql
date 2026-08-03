-- Phone column privacy.
--
-- The exposure: Supabase's default API grants include a table-level
-- `GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated`, and
-- migration 00002 added an RLS policy making every profile row readable by any
-- authenticated session (including anonymous ones). Together, anyone holding
-- the anon key could enumerate full phone numbers via PostgREST — the app's own
-- queries are narrow, but the API allows more.
--
-- Note on mechanism: a table-level SELECT privilege covers every column, and a
-- column-level REVOKE cannot subtract from it. Revoking `SELECT (phone)` while
-- the table-level grant stands is a no-op. The table-level privilege has to go
-- first, then the safe columns are granted back explicitly.

REVOKE SELECT ON public.users FROM anon;
REVOKE SELECT ON public.users FROM authenticated;

-- Everything the client legitimately reads. `phone` is deliberately absent: it
-- is read server-side via the service role (which bypasses grants) and masked
-- to its last 4 digits before it leaves the server.
-- Audited call sites: dashboard reads display_name; the voter breakdown joins
-- users(display_name) and needs id for the FK embed; updateDisplayName's WHERE
-- clause needs id. No app query selects * from users.
GRANT SELECT (id, display_name, avatar_url, created_at) ON public.users TO anon;
GRANT SELECT (id, display_name, avatar_url, created_at) ON public.users TO authenticated;
