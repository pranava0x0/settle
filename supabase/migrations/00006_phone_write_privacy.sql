-- Phone must be unwritable from the browser, not merely unreadable.
--
-- Migration 00005 closed the READ side of `users.phone`. The WRITE side stayed
-- open: Supabase's default API grants hand `anon` and `authenticated` INSERT and
-- UPDATE on every column, and the "Users can update own profile" RLS policy
-- lets a session update its own row. So any client could set its own `phone` to
-- an arbitrary number.
--
-- That matters because `phone` is an identity source. The voter breakdown falls
-- back to a masked phone ("••• 1694") when a voter has no display name, so a
-- writable phone column is a cheap way to wear somebody else's label in a vote
-- list. Only the service role sets phone, and only during the anonymous->OTP
-- upgrade in `upgradeAnonymousUser()`.
--
-- Same mechanism note as 00005: a column-level REVOKE cannot subtract from a
-- table-level grant. Drop the table-level privilege first, then grant back the
-- columns the app actually writes.

REVOKE INSERT, UPDATE ON public.users FROM anon;
REVOKE INSERT, UPDATE ON public.users FROM authenticated;

-- Audited write call sites:
--   - handle_new_user() inserts (id, phone) but runs SECURITY DEFINER, so it is
--     unaffected by these grants.
--   - updateDisplayName() updates display_name.
-- Nothing in client-reachable code writes phone.
GRANT INSERT (id, display_name, avatar_url) ON public.users TO authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.users TO anon;
GRANT UPDATE (display_name, avatar_url) ON public.users TO authenticated;
