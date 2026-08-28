-- Fixes from the PR review of the result-SMS pipeline. Four findings, all
-- reproduced against the live database before being fixed.

-- ---------------------------------------------------------------------------
-- 1. The privileged RPCs were callable by anyone holding the public anon key.
--
-- Postgres grants EXECUTE on a new function to PUBLIC by default, and revoking
-- from `anon`/`authenticated` does not subtract from that. All four SECURITY
-- DEFINER functions therefore answered an unauthenticated caller with 200:
-- `claim_result_notifications` would have handed out recipients' phone numbers
-- and message bodies and moved their rows to 'sending'.
--
-- This is the same shape as ISSUE-039 — a narrow revoke sitting under a broader
-- grant, where the narrow revoke reads like it did something. Verified after:
-- unauthenticated 401, authenticated 403.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.close_expired_squabbles() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_result_notifications() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tick_squabble_results() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_result_notifications(INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.complete_result_notification(UUID, BOOLEAN, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.requeue_stalled_notifications() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.close_expired_squabbles() TO service_role;
GRANT EXECUTE ON FUNCTION public.enqueue_result_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.tick_squabble_results() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_result_notifications(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_result_notification(UUID, BOOLEAN, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.requeue_stalled_notifications() TO service_role;

-- ---------------------------------------------------------------------------
-- 2. The stall reaper measured from the wrong timestamp.
--
-- It used `created_at`, which is set at enqueue time and never changes. A row
-- that waited out a backlog for more than ten minutes satisfied the predicate
-- the instant it became 'sending', so the next tick could return it to
-- 'pending' while the sender was still calling Twilio — reintroducing exactly
-- the double send that the 'sending' state exists to prevent. Stall has to be
-- measured from when the row was CLAIMED.
-- ---------------------------------------------------------------------------
ALTER TABLE public.result_notifications
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.claim_result_notifications(batch_size INTEGER DEFAULT 20)
RETURNS TABLE (id UUID, phone TEXT, body TEXT, attempts INTEGER) AS $$
  UPDATE public.result_notifications n
  SET attempts = n.attempts + 1,
      status = 'sending',
      claimed_at = now()
  WHERE n.id IN (
    SELECT c.id FROM public.result_notifications c
    WHERE c.status = 'pending' AND c.attempts < 3
    ORDER BY c.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT batch_size
  )
  RETURNING n.id, n.phone, n.body, n.attempts;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.requeue_stalled_notifications()
RETURNS INTEGER AS $$
DECLARE requeued INTEGER := 0;
BEGIN
  UPDATE public.result_notifications
  SET status = CASE WHEN attempts >= 3 THEN 'failed'::notification_status
                    ELSE 'pending'::notification_status END,
      last_error = coalesce(last_error, 'Sender did not report an outcome; requeued.'),
      claimed_at = NULL
  WHERE status = 'sending'
    -- coalesce covers rows claimed before this column existed.
    AND coalesce(claimed_at, created_at) < now() - interval '10 minutes';
  GET DIAGNOSTICS requeued = ROW_COUNT;
  RETURN requeued;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.complete_result_notification(
  notification_id UUID,
  succeeded BOOLEAN,
  error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
  UPDATE public.result_notifications
  SET status = CASE
        WHEN succeeded THEN 'sent'::notification_status
        WHEN attempts >= 3 THEN 'failed'::notification_status
        ELSE 'pending'::notification_status
      END,
      sent_at = CASE WHEN succeeded THEN now() ELSE sent_at END,
      claimed_at = NULL,
      last_error = CASE WHEN succeeded THEN NULL ELSE error_message END
  WHERE id = notification_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- ---------------------------------------------------------------------------
-- 3. Normalisation only covered a short lookalike list.
--
-- An emoji or an accented letter survived and forced UCS-2 on the whole message
-- — where a segment is 70 characters, not 160 — while the builder went on
-- budgeting 160. "Is [emoji] a sandwich, cafe edition?" produced a 114-character
-- body that billed as two segments despite the one-segment guarantee.
--
-- Everything outside printable ASCII is now removed, and the budget counts
-- GSM-7 extension characters ( [ ] { } \ ^ ~ | ) as the two septets they cost.
-- Truncation is by septet too: the first attempt at this still used left(),
-- which counts characters, and a label of "[y][y][y]..." produced 216 septets.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sms_normalize(value TEXT)
RETURNS TEXT AS $$
  SELECT regexp_replace(
           translate(
             coalesce(value, ''),
             U&'\2018\2019\201C\201D\2013\2014\00A0',
             '''''""-- '
           ),
           '[^\x20-\x7E]', '', 'g'
         );
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.gsm7_septets(value TEXT)
RETURNS INTEGER AS $$
  SELECT length(value)
       + coalesce(length(regexp_replace(value, '[^\[\]{}\\^~|]', '', 'g')), 0);
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.gsm7_truncate(value TEXT, max_septets INTEGER)
RETURNS TEXT AS $$
DECLARE
  out_text TEXT := coalesce(value, '');
BEGIN
  IF max_septets <= 0 THEN
    RETURN '';
  END IF;
  WHILE public.gsm7_septets(out_text) > max_septets AND length(out_text) > 0 LOOP
    out_text := substr(out_text, 1, length(out_text) - 1);
  END LOOP;
  RETURN out_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.build_result_sms(
  question TEXT,
  winner_label TEXT,
  base TEXT,
  slug TEXT
) RETURNS TEXT AS $$
DECLARE
  link TEXT;
  suffix TEXT;
  prefix TEXT := 'Squabble settled: ';
  budget INTEGER;
  head TEXT;
  normalized_question TEXT;
BEGIN
  link := rtrim(coalesce(base, ''), '/') || '/s/' || slug;

  -- The winner label is free text up to 140 chars, so it gets its own cap
  -- before it can crowd out the question or the link.
  suffix := CASE
    WHEN winner_label IS NULL THEN ' - dead even, no winner. '
    ELSE ' - winner: '
         || public.gsm7_truncate(public.sms_normalize(winner_label), 60)
         || '. '
  END;

  budget := 160 - public.gsm7_septets(link)
                - public.gsm7_septets(suffix)
                - public.gsm7_septets(prefix);

  IF budget < 12 THEN
    -- No room for the question at all. Keep the link whole; it is the only part
    -- of the message that has to work.
    RETURN public.gsm7_truncate(
             rtrim(prefix) || suffix,
             160 - public.gsm7_septets(link)
           ) || link;
  END IF;

  normalized_question := public.sms_normalize(question);
  IF public.gsm7_septets(normalized_question) <= budget THEN
    head := normalized_question;
  ELSE
    head := rtrim(public.gsm7_truncate(normalized_question, budget - 3)) || '...';
  END IF;

  RETURN prefix || head || suffix || link;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

REVOKE EXECUTE ON FUNCTION public.gsm7_truncate(TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.gsm7_septets(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sms_normalize(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.build_result_sms(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
