-- Schedule the close/enqueue tick.
--
-- Safe to apply before any Twilio setup exists. The close half only does what
-- the app already does lazily on read, using identical rules; the enqueue half
-- returns immediately while app_settings.sms_results_enabled is false.
--
-- The SENDER is deliberately not scheduled here. It needs Twilio credentials
-- and a way to authenticate to the Edge Function, neither of which belongs in a
-- committed migration. See docs/RESULT_SMS.md for the steps to turn it on.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('squabble-results-tick')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'squabble-results-tick');

SELECT cron.schedule(
  'squabble-results-tick',
  '* * * * *',
  $$SELECT public.tick_squabble_results()$$
);
