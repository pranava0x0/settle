-- Invariants for the result-SMS pipeline.
--
-- These are SQL because the logic is SQL. A TypeScript test would have to
-- re-implement build_result_sms() and would then be testing its own copy — the
-- exact failure mode that let "SquabbleCard status labels" sit green for months
-- while the component said something else.
--
-- Run against a scratch database or a Supabase branch, never production:
--   psql "$DATABASE_URL" -f supabase/tests/result_sms_test.sql
-- Everything happens inside a transaction that is rolled back at the end.

BEGIN;

DO $$
DECLARE
  d_id UUID;
  u_phone UUID; u_optout UUID; u_anon UUID;
  first_run INTEGER; second_run INTEGER;
  queued INTEGER; longest INTEGER; non_ascii INTEGER;
BEGIN
  -- ---- fixture -----------------------------------------------------------
  -- Deliberately picks users who LACK the field the code reads: one voter with
  -- no phone at all and one who opted out. A fixture where everyone has a phone
  -- proves nothing about the filtering.
  INSERT INTO auth.users (id, instance_id, aud, role, email)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.invalid')
  RETURNING id INTO u_phone;
  INSERT INTO auth.users (id, instance_id, aud, role, email)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.invalid')
  RETURNING id INTO u_optout;
  INSERT INTO auth.users (id, instance_id, aud, role, email)
  VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'c@test.invalid')
  RETURNING id INTO u_anon;

  UPDATE public.users SET phone = '+15550000001', sms_opt_out = false WHERE id = u_phone;
  UPDATE public.users SET phone = '+15550000002', sms_opt_out = true  WHERE id = u_optout;
  UPDATE public.users SET phone = NULL,           sms_opt_out = false WHERE id = u_anon;

  -- Open first: the vote-window trigger (00007) refuses inserts on an expired
  -- squabble, which is itself the point of that migration.
  INSERT INTO public.disputes (slug, creator_id, question, side_a, side_b, status, expires_at)
  VALUES ('TESTSMS1', u_phone, 'Test question', 'Yes', 'No', 'open', now() + interval '1 hour')
  RETURNING id INTO d_id;

  INSERT INTO public.votes (dispute_id, user_id, side)
  VALUES (d_id, u_phone, 'a'), (d_id, u_optout, 'a'), (d_id, u_anon, 'b');

  UPDATE public.disputes SET expires_at = now() - interval '1 minute' WHERE id = d_id;

  -- ---- 1. flag off means nothing is queued -------------------------------
  UPDATE public.app_settings SET sms_results_enabled = false WHERE id;
  PERFORM public.close_expired_squabbles();
  IF public.enqueue_result_notifications() <> 0 THEN
    RAISE EXCEPTION 'FAIL: enqueued while the feature flag was off';
  END IF;

  -- ---- 2. the close applied majority rules -------------------------------
  IF (SELECT status FROM public.disputes WHERE id = d_id) <> 'closed'
     OR (SELECT winner_side FROM public.disputes WHERE id = d_id) <> 'a' THEN
    RAISE EXCEPTION 'FAIL: close_expired_squabbles did not settle 2-1 as a win for a';
  END IF;

  -- ---- 3. enqueue is idempotent ------------------------------------------
  UPDATE public.app_settings SET sms_results_enabled = true WHERE id;
  DELETE FROM public.result_notifications WHERE dispute_id = d_id;
  first_run  := public.enqueue_result_notifications();
  second_run := public.enqueue_result_notifications();
  IF second_run <> 0 THEN
    RAISE EXCEPTION 'FAIL: second enqueue queued % more rows; double-send is possible', second_run;
  END IF;

  -- ---- 4. recipients exclude opt-outs and phoneless voters ---------------
  SELECT count(*) INTO queued FROM public.result_notifications WHERE dispute_id = d_id;
  IF queued <> 1 THEN
    RAISE EXCEPTION 'FAIL: expected exactly 1 recipient (creator+voter deduped, 1 opted out, 1 phoneless), got %', queued;
  END IF;
  IF EXISTS (SELECT 1 FROM public.result_notifications WHERE dispute_id = d_id AND user_id = u_optout) THEN
    RAISE EXCEPTION 'FAIL: queued a message for a user who opted out';
  END IF;
  IF EXISTS (SELECT 1 FROM public.result_notifications WHERE dispute_id = d_id AND user_id = u_anon) THEN
    RAISE EXCEPTION 'FAIL: queued a message for a user with no phone';
  END IF;

  -- ---- 5. the age guard bounds the blast radius --------------------------
  DELETE FROM public.result_notifications WHERE dispute_id = d_id;
  UPDATE public.disputes SET closed_at = now() - interval '10 days' WHERE id = d_id;
  IF public.enqueue_result_notifications() <> 0 THEN
    RAISE EXCEPTION 'FAIL: queued a squabble that settled 10 days ago; enabling the flag would blast history';
  END IF;
  UPDATE public.disputes SET closed_at = now() WHERE id = d_id;

  -- ---- 6. every body is one GSM-7 segment with an intact link ------------
  PERFORM public.enqueue_result_notifications();
  SELECT max(length(body)), count(*) FILTER (WHERE body ~ '[^\x00-\x7F]')
    INTO longest, non_ascii
  FROM public.result_notifications WHERE dispute_id = d_id;

  IF longest > 160 THEN
    RAISE EXCEPTION 'FAIL: body of % chars exceeds one SMS segment', longest;
  END IF;
  IF non_ascii > 0 THEN
    RAISE EXCEPTION 'FAIL: % bodies contain non-ASCII, forcing UCS-2 (70-char segments)', non_ascii;
  END IF;
  IF EXISTS (SELECT 1 FROM public.result_notifications WHERE dispute_id = d_id AND body NOT LIKE '%http%') THEN
    RAISE EXCEPTION 'FAIL: a body lost its link to truncation';
  END IF;

  -- ---- 7. long free-text sides do not produce "... doesn't wins" ---------
  IF public.build_result_sms('Q', 'it is not a wedding if Ricky does not tear his pants', 'https://x.test', 'abc')
     NOT LIKE '%winner: it is not a wedding%' THEN
    RAISE EXCEPTION 'FAIL: winner label is not rendered as "winner: X"';
  END IF;

  -- ---- 8. normalisation actually strips the phone-keyboard characters ----
  IF public.sms_normalize('it’s a “test” – and — more') ~ '[^\x00-\x7F]' THEN
    RAISE EXCEPTION 'FAIL: sms_normalize left non-ASCII characters in place';
  END IF;

  -- ---- 9. a second sender run must not re-claim the same rows ------------
  -- This is the one that caught a real double-send. The original claim only
  -- incremented `attempts` and left the row 'pending', so a claim immediately
  -- followed by another returned the SAME rows (overlap 5 of 5) — meaning the
  -- next cron tick would text everyone a second time.
  DECLARE
    overlap INTEGER;
  BEGIN
    WITH c1 AS (SELECT id FROM public.claim_result_notifications(10)),
         c2 AS (SELECT id FROM public.claim_result_notifications(10))
    SELECT count(*) INTO overlap
    FROM c1 JOIN c2 ON c2.id = c1.id;

    IF overlap <> 0 THEN
      RAISE EXCEPTION 'FAIL 9: two claims returned % of the same rows; the same message would be sent twice', overlap;
    END IF;
  END;

  RAISE NOTICE 'All result-SMS invariants held.';
END $$;

ROLLBACK;
