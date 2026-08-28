-- Enforce the voting window where the write happens.
--
-- `castVote()` SELECTs the dispute, checks `status`/`expires_at`, then INSERTs.
-- Between the check and the insert the timer can run out, so a vote can land
-- after expiry and be counted. The window is small but it is real, and the same
-- gap exists on the auto-cast path in `/s/[slug]/page.tsx`, which inserts
-- directly without going through castVote at all.
--
-- An app-level guard can only ever cover the call sites that remember to call
-- it. A trigger covers every writer, including the direct insert and anything
-- added later.
--
-- The trigger deliberately does NOT fire for the service role: vote merging in
-- `upgradeAnonymousUser()` moves an already-cast vote onto the phone account
-- after the squabble may well have closed, and that is legitimate.

CREATE OR REPLACE FUNCTION public.enforce_vote_window()
RETURNS TRIGGER AS $$
DECLARE
  target RECORD;
BEGIN
  -- Privileged merges bypass the window; see note above.
  IF current_setting('role', true) = 'service_role'
     OR auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  SELECT status, expires_at INTO target
  FROM public.disputes
  WHERE id = NEW.dispute_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Squabble not found'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF target.status <> 'open' THEN
    RAISE EXCEPTION 'This squabble is no longer accepting votes'
      USING ERRCODE = 'check_violation';
  END IF;

  IF target.expires_at <= now() THEN
    RAISE EXCEPTION 'Voting time has expired'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_vote_window_on_insert ON public.votes;
CREATE TRIGGER enforce_vote_window_on_insert
  BEFORE INSERT ON public.votes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vote_window();
