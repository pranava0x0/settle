-- Allow authenticated users to read all user profiles
-- Needed for: creator viewing voter identities in dispute breakdown
-- Phone is in the table but application queries should only SELECT id, display_name
CREATE POLICY "Authenticated users can read profiles"
  ON public.users FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Drop the old restrictive policy (only read own profile)
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;

-- Enable Supabase Realtime for the votes table
-- Needed for: live vote count updates via RealtimeVoteListener
ALTER PUBLICATION supabase_realtime ADD TABLE public.votes;
