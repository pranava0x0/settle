-- Text the result out when the timer is up.
--
-- Three moving parts, deliberately separated:
--   1. close_expired_squabbles()      -- writes outcomes without waiting for a page view
--   2. enqueue_result_notifications() -- turns settled squabbles into queued messages
--   3. result_notifications           -- an idempotent outbox the sender drains
--
-- Why an outbox rather than sending inline: an SMS costs money and cannot be
-- unsent. A queue row with a unique key per (squabble, recipient) makes a double
-- send structurally impossible even if the cron overlaps, the sender retries, or
-- someone runs the function by hand. Sending inline from a trigger gives up all
-- three guarantees.
--
-- The close step is kept SEPARATE from the enqueue step because the app also
-- closes squabbles lazily on read. If enqueueing lived inside the close, every
-- squabble that happened to be closed by a page view would silently never be
-- texted. Enqueue therefore scans for *settled* squabbles regardless of who
-- settled them.

-- ---------------------------------------------------------------------------
-- Feature flag. Off by default: this migration is inert until Twilio
-- credentials are configured and the flag is deliberately flipped.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  sms_results_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Squabbles that settled longer ago than this are never texted about. Without
  -- it, flipping the flag on would enqueue a message for every squabble in the
  -- table's history and bill for all of them.
  sms_max_age_minutes INTEGER NOT NULL DEFAULT 60,
  -- Postgres cannot infer the app's public origin, and a relative "/s/slug" is
  -- unclickable in a text message.
  site_url TEXT NOT NULL DEFAULT 'https://settle-ochre-eight.vercel.app',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- No policies: service role only. The browser has no business reading or
-- writing the flag.
REVOKE ALL ON public.app_settings FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- Per-user opt-out. Texting someone who asked you to stop is not a bug you get
-- to fix later, so the column ships with the feature rather than after it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sms_opt_out BOOLEAN NOT NULL DEFAULT false;

GRANT SELECT (sms_opt_out) ON public.users TO authenticated;
GRANT UPDATE (sms_opt_out) ON public.users TO authenticated;

-- ---------------------------------------------------------------------------
-- The outbox.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
    -- 'sending' is what makes the outbox idempotent ACROSS runs, not just
    -- across concurrent transactions. See claim_result_notifications below.
    CREATE TYPE notification_status AS ENUM ('pending', 'sending', 'sent', 'failed', 'skipped');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.result_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  status notification_status NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  -- The whole anti-double-send guarantee lives here.
  UNIQUE (dispute_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_result_notifications_pending
  ON public.result_notifications (status, created_at)
  WHERE status = 'pending';

ALTER TABLE public.result_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.result_notifications FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Close expired squabbles server-side.
--
-- Mirrors closeSquabble() in src/lib/actions/squabbles.ts exactly: no votes or a
-- tie settles as 'expired' with no winner; otherwise 'closed' with the majority
-- side. Keeping the rules identical matters -- if they drift, a squabble gets a
-- different answer depending on whether a human happened to open the page first.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_expired_squabbles()
RETURNS INTEGER AS $$
DECLARE
  closed_count INTEGER := 0;
BEGIN
  WITH expired AS (
    SELECT d.id,
           count(*) FILTER (WHERE v.side = 'a') AS votes_a,
           count(*) FILTER (WHERE v.side = 'b') AS votes_b
    FROM public.disputes d
    LEFT JOIN public.votes v ON v.dispute_id = d.id
    WHERE d.status = 'open' AND d.expires_at <= now()
    GROUP BY d.id
  ), resolved AS (
    SELECT id,
           CASE WHEN votes_a = votes_b THEN 'expired' ELSE 'closed' END::dispute_status AS new_status,
           CASE WHEN votes_a = votes_b THEN NULL
                WHEN votes_a > votes_b THEN 'a'
                ELSE 'b' END AS new_winner
    FROM expired
  )
  UPDATE public.disputes d
  SET status = r.new_status,
      winner_side = r.new_winner,
      closed_at = now()
  FROM resolved r
  WHERE d.id = r.id;

  GET DIAGNOSTICS closed_count = ROW_COUNT;
  RETURN closed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- Message construction.
--
-- Keep every message to ONE billed segment. A GSM-7 SMS segment is 160
-- characters; the moment one character falls outside GSM-7 the whole message is
-- re-encoded as UCS-2 and a segment becomes 70 -- so a "160 char" body silently
-- bills as three. Phone keyboards produce exactly the offenders (curly quotes,
-- en/em dashes), and real squabble text in this database already contains them.
--
-- The winner is rendered as "winner: X" rather than "X wins" because sides are
-- free text up to 140 chars. A real row produced "it's not a wedding if Ricky
-- doesn't wins".
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sms_normalize(value TEXT)
RETURNS TEXT AS $$
  SELECT translate(
           coalesce(value, ''),
           U&'\2018\2019\201C\201D\2013\2014\00A0',
           '''''""-- '
         );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.build_result_sms(
  question TEXT,
  winner_label TEXT,
  base TEXT,
  slug TEXT
) RETURNS TEXT AS $$
DECLARE
  link TEXT;
  suffix TEXT;
  budget INTEGER;
  head TEXT;
BEGIN
  link := rtrim(coalesce(base, ''), '/') || '/s/' || slug;
  suffix := CASE
    WHEN winner_label IS NULL THEN ' - dead even, no winner. '
    ELSE ' - winner: ' || public.sms_normalize(winner_label) || '. '
  END;

  -- Reserve the link and the suffix; the question gets what is left. A
  -- truncated link is a useless message, so the link is never what gets cut.
  budget := 160 - length(link) - length(suffix) - length('Squabble settled: ');

  IF budget < 12 THEN
    -- Pathological case (very long winner label): drop the question entirely
    -- rather than emit a message with no room for it.
    RETURN left('Squabble settled' || suffix, 160 - length(link)) || link;
  END IF;

  head := public.sms_normalize(question);
  IF length(head) > budget THEN
    head := rtrim(substr(head, 1, budget - 3)) || '...';
  END IF;

  RETURN 'Squabble settled: ' || head || suffix || link;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 2. Queue a message per recipient for freshly settled squabbles.
--
-- Recipients are the creator plus everyone who voted, minus anyone without a
-- usable phone and anyone who opted out. Anonymous voters have no phone, so they
-- are simply absent -- not an error.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enqueue_result_notifications()
RETURNS INTEGER AS $$
DECLARE
  settings RECORD;
  queued_count INTEGER := 0;
  base TEXT;
BEGIN
  SELECT sms_results_enabled, sms_max_age_minutes, site_url INTO settings
  FROM public.app_settings WHERE id;

  IF NOT FOUND OR NOT settings.sms_results_enabled THEN
    RETURN 0;
  END IF;

  base := settings.site_url;

  WITH settled AS (
    SELECT d.id, d.slug, d.question, d.side_a, d.side_b, d.winner_side, d.creator_id
    FROM public.disputes d
    WHERE d.status <> 'open'
      AND d.closed_at IS NOT NULL
      -- The age guard. Turning the flag on must not text about last month.
      AND d.closed_at > now() - make_interval(mins => settings.sms_max_age_minutes)
  ), recipients AS (
    SELECT DISTINCT s.id AS dispute_id, s.slug, s.question, s.side_a, s.side_b,
           s.winner_side, u.id AS user_id, u.phone
    FROM settled s
    JOIN public.votes v ON v.dispute_id = s.id
    JOIN public.users u ON u.id = v.user_id
    WHERE u.phone IS NOT NULL AND u.phone <> '' AND NOT u.sms_opt_out

    UNION

    SELECT DISTINCT s.id, s.slug, s.question, s.side_a, s.side_b,
           s.winner_side, u.id, u.phone
    FROM settled s
    JOIN public.users u ON u.id = s.creator_id
    WHERE u.phone IS NOT NULL AND u.phone <> '' AND NOT u.sms_opt_out
  )
  INSERT INTO public.result_notifications (dispute_id, user_id, phone, body)
  SELECT r.dispute_id, r.user_id, r.phone,
         public.build_result_sms(
           r.question,
           CASE WHEN r.winner_side = 'a' THEN r.side_a
                WHEN r.winner_side = 'b' THEN r.side_b
                ELSE NULL END,
           base, r.slug)
  FROM recipients r
  ON CONFLICT (dispute_id, user_id) DO NOTHING;

  GET DIAGNOSTICS queued_count = ROW_COUNT;
  RETURN queued_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 3. Claim / complete, used by the send-result-sms Edge Function.
--
-- Claiming moves a row OUT of 'pending' into 'sending'. That transition, not the
-- lock, is what makes the outbox idempotent.
--
-- FOR UPDATE SKIP LOCKED alone is not enough and the first version of this
-- function proved it: the claim RPC commits the moment it returns, so a row that
-- only had `attempts` incremented sat pending and unlocked while the sender was
-- still talking to Twilio. The next tick a minute later claimed the same row and
-- sent the message twice. A test claiming twice in a row returned an overlap of
-- 5 of 5 rows before this change and 0 after.
--
-- `attempts` increments AT CLAIM TIME, not after the send. If the sender crashes
-- mid-flight the attempt still counts, so a row that reliably kills the sender
-- gets retired instead of retrying forever.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_result_notifications(batch_size INTEGER DEFAULT 20)
RETURNS TABLE (id UUID, phone TEXT, body TEXT, attempts INTEGER) AS $$
  UPDATE public.result_notifications n
  SET attempts = n.attempts + 1,
      status = 'sending'
  WHERE n.id IN (
    SELECT c.id FROM public.result_notifications c
    WHERE c.status = 'pending' AND c.attempts < 3
    ORDER BY c.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT batch_size
  )
  RETURNING n.id, n.phone, n.body, n.attempts;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.complete_result_notification(
  notification_id UUID,
  succeeded BOOLEAN,
  error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
  UPDATE public.result_notifications
  SET status = CASE
        WHEN succeeded THEN 'sent'::notification_status
        -- Only give up once the attempt budget is spent; otherwise leave it
        -- pending so the next tick retries a transient Twilio failure.
        WHEN attempts >= 3 THEN 'failed'::notification_status
        ELSE 'pending'::notification_status
      END,
      sent_at = CASE WHEN succeeded THEN now() ELSE sent_at END,
      last_error = CASE WHEN succeeded THEN NULL ELSE error_message END
  WHERE id = notification_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Rows stranded in 'sending' (the sender died between claim and complete) go
-- back in the queue. 10 minutes is far longer than a Twilio call, so this only
-- fires on a genuine crash. Without it, a crashed sender would leave messages
-- stuck in 'sending' forever and nobody would ever get the result.
CREATE OR REPLACE FUNCTION public.requeue_stalled_notifications()
RETURNS INTEGER AS $$
DECLARE requeued INTEGER := 0;
BEGIN
  UPDATE public.result_notifications
  SET status = CASE WHEN attempts >= 3 THEN 'failed'::notification_status
                    ELSE 'pending'::notification_status END,
      last_error = coalesce(last_error, 'Sender did not report an outcome; requeued.')
  WHERE status = 'sending'
    AND created_at < now() - interval '10 minutes';
  GET DIAGNOSTICS requeued = ROW_COUNT;
  RETURN requeued;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 4. One entry point for the scheduler.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tick_squabble_results()
RETURNS TABLE (closed INTEGER, queued INTEGER, requeued INTEGER) AS $$
BEGIN
  closed   := public.close_expired_squabbles();
  queued   := public.enqueue_result_notifications();
  requeued := public.requeue_stalled_notifications();
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.close_expired_squabbles() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_result_notifications() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tick_squabble_results() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_result_notifications(INTEGER) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_result_notification(UUID, BOOLEAN, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.requeue_stalled_notifications() FROM anon, authenticated;
