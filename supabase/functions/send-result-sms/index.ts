/**
 * Drains the result_notifications outbox and sends each message via Twilio.
 *
 * Invoked on a schedule (see migration 00009). Safe to run concurrently: rows
 * are claimed with FOR UPDATE SKIP LOCKED inside claim_result_notifications(),
 * so two overlapping runs never pick up the same message.
 *
 * Credentials come from the function's own environment. They are set with
 * `supabase secrets set` and never appear in this repository.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";

type ClaimedNotification = {
  id: string;
  phone: string;
  body: string;
  attempts: number;
};

const BATCH_SIZE = 20;

const requireEnv = (name: string): string => {
  const value = Deno.env.get(name);
  // Fail loud and immediately. A sender that starts up without credentials and
  // quietly marks everything failed would burn all three attempts per row.
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

Deno.serve(async () => {
  let accountSid: string, authToken: string, fromNumber: string;
  try {
    accountSid = requireEnv("TWILIO_ACCOUNT_SID");
    authToken = requireEnv("TWILIO_AUTH_TOKEN");
    fromNumber = requireEnv("TWILIO_FROM_NUMBER");
  } catch (error) {
    console.error("send-result-sms: configuration error.", error);
    return Response.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }

  const supabase = createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_result_notifications",
    { batch_size: BATCH_SIZE },
  );

  if (claimError) {
    console.error("send-result-sms: claim failed.", claimError.message);
    return Response.json({ error: claimError.message }, { status: 500 });
  }

  const notifications = (claimed ?? []) as ClaimedNotification[];
  if (notifications.length === 0) {
    return Response.json({ claimed: 0, sent: 0, failed: 0 });
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const authHeader = `Basic ${btoa(`${accountSid}:${authToken}`)}`;

  let sent = 0;
  let failed = 0;

  for (const notification of notifications) {
    let succeeded = false;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: notification.phone,
          From: fromNumber,
          Body: notification.body,
        }),
      });

      if (response.ok) {
        succeeded = true;
      } else {
        // Keep Twilio's own message: "unverified number" on a trial account
        // looks nothing like a rate limit, and the distinction matters.
        errorMessage = `Twilio ${response.status}: ${await response.text()}`;
      }
    } catch (error) {
      errorMessage = `Network error: ${(error as Error).message}`;
    }

    if (succeeded) {
      sent += 1;
    } else {
      failed += 1;
      console.error(
        `send-result-sms: ${notification.id} attempt ${notification.attempts} failed. ${errorMessage}`,
      );
    }

    const { error: completeError } = await supabase.rpc(
      "complete_result_notification",
      {
        notification_id: notification.id,
        succeeded,
        error_message: errorMessage,
      },
    );

    if (completeError) {
      // The message may well have been delivered; losing the bookkeeping is what
      // would cause a duplicate on the next tick, so this is worth shouting about.
      console.error(
        `send-result-sms: could not record outcome for ${notification.id}. ${completeError.message}`,
      );
    }
  }

  return Response.json({ claimed: notifications.length, sent, failed });
});
