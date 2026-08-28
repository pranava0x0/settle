# Result texts

Sends one SMS per participant when a squabble's timer runs out.

**It is off right now.** `app_settings.sms_results_enabled` is `false`, the outbox
is empty, and nothing can send until the steps below are done deliberately.

## How it works

```
cron (every minute)          Edge Function (scheduled separately)
  tick_squabble_results()      send-result-sms
    ├─ close_expired_squabbles()   ├─ claim_result_notifications()  -- FOR UPDATE SKIP LOCKED
    └─ enqueue_result_notifications()  ├─ POST api.twilio.com
         └─ INSERT result_notifications  └─ complete_result_notification()
```

The outbox (`result_notifications`) is the whole safety story, and it takes two
mechanisms, not one:

- `UNIQUE (dispute_id, user_id)` — a given person is *queued* for a given
  squabble exactly once, however often the enqueue runs.
- `pending -> sending -> sent` — a queued row is *claimed* exactly once. The
  claim transitions the row out of `pending`; `FOR UPDATE SKIP LOCKED` alone is
  not enough, because the claim RPC commits the moment it returns and the row
  would sit pending and unlocked while the sender was still calling Twilio. The
  next tick would then send the same message again.

`requeue_stalled_notifications()` returns rows stuck in `sending` for over 10
minutes (sender crashed between claim and complete) so they retry rather than
vanish. It runs as part of the same tick.

Closing is separate from enqueueing because the app *also* closes squabbles
lazily when someone loads the page. If enqueueing lived inside the close, every
squabble that a page view happened to settle would never be texted.

## Turning it on

1. **Get Twilio off trial.** A trial account can only send to numbers you have
   pre-verified in the Twilio console. Until it is upgraded, every message to
   anyone else fails with `Twilio 400: ... unverified`.

2. **Set the secrets.** These never go in this repo.
   ```bash
   supabase secrets set TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=+1...
   ```

3. **Deploy the sender.**
   ```bash
   supabase functions deploy send-result-sms
   ```

4. **Point the links at the right origin** if it is not the Vercel default:
   ```sql
   update public.app_settings set site_url = 'https://your-domain.com' where id;
   ```

5. **Schedule the sender.** It needs to authenticate to the Edge Function, so
   store the key in Vault rather than inlining it in the cron command:
   ```sql
   select vault.create_secret('<service-role-key>', 'send_result_sms_key');

   select cron.schedule('send-result-sms', '* * * * *', $$
     select net.http_post(
       url     := 'https://<project-ref>.supabase.co/functions/v1/send-result-sms',
       headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || (
                      select decrypted_secret from vault.decrypted_secrets
                      where name = 'send_result_sms_key')),
       body    := '{}'::jsonb
     )
   $$);
   ```

6. **Flip the flag last**, once everything above is in place:
   ```sql
   update public.app_settings set sms_results_enabled = true, updated_at = now() where id;
   ```

## Before you flip it

`sms_max_age_minutes` (default 60) is the blast radius guard. Only squabbles that
settled within that window are ever queued — without it, enabling the flag would
enqueue a message for every squabble in the table's history and bill for all of
them. Do a dry run first:

```sql
-- How many messages would the next tick queue? Should be a number you recognise.
begin;
update public.app_settings set sms_results_enabled = true where id;
select public.enqueue_result_notifications() as would_queue;
select phone, body from public.result_notifications;
rollback;
```

## Turning it off

```sql
update public.app_settings set sms_results_enabled = false, updated_at = now() where id;
```
Already-queued rows will still drain. To stop those too:
```sql
update public.result_notifications set status = 'skipped' where status = 'pending';
```

## Opting out

Anyone with a verified phone gets a "Text me results" switch on their dashboard,
which writes `users.sms_opt_out`. `enqueue_result_notifications()` excludes those
users, so an opt-out takes effect from the next tick onward. It does not retract
messages already queued — the same query as "Turning it off" does that.

## Who gets a message

The creator, plus everyone who voted, minus:
- anyone with no phone on file (every anonymous voter — this is normal, not an error)
- anyone with `sms_opt_out = true`

Recipients are de-duplicated, so a creator who also voted gets one message.

## Costs

Each body is built to fit one GSM-7 segment (160 chars). `sms_normalize()`
transliterates curly quotes and en/em dashes first, because a single non-GSM-7
character re-encodes the whole message as UCS-2 where a segment is 70 characters
— turning one billed segment into three. If you change the copy, keep it ASCII
and re-check `max(length(body))`.

## Debugging

```sql
select status, count(*), max(last_error) from public.result_notifications group by status;
select * from cron.job_run_details order by start_time desc limit 10;
```
A row retries up to 3 times, then lands in `failed` with `last_error` holding
Twilio's own message. Rows sitting in `sending` for more than 10 minutes mean the
sender is crashing before it reports an outcome — check the function logs; the
reaper will requeue them meanwhile.

Invariants are covered by `supabase/tests/result_sms_test.sql`, which runs inside
a transaction and rolls back. Run it against a scratch database or a branch, not
production.
