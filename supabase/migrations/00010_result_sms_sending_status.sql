-- Drift repair for databases that already ran the FIRST version of 00008.
--
-- Fresh installs get all of this from 00008 directly; this migration exists
-- because the deployed database had already applied the earlier form, where
-- claim_result_notifications() only incremented `attempts` and left the row
-- `pending`. That was a double-send hole: the claim RPC commits as soon as it
-- returns, so the row sat pending and unlocked while the sender was still
-- talking to Twilio, and the next tick claimed and sent it again. Claiming
-- twice in a row returned an overlap of 5 of 5 rows before this change, 0 after.
--
-- Safe to re-run, and a no-op on a database built from the current 00008.

-- Separate statement on purpose: Postgres refuses to USE a new enum value in the
-- same transaction that adds it ("unsafe use of new value ... must be committed"),
-- which is why this cannot be folded into the function definitions below.
ALTER TYPE notification_status ADD VALUE IF NOT EXISTS 'sending';
