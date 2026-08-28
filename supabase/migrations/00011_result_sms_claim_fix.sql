-- Second half of the 00010 drift repair; separate file because the 'sending'
-- enum value must be committed before any function body can reference it.

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

-- The return type gains a column, so CREATE OR REPLACE is not enough.
DROP FUNCTION IF EXISTS public.tick_squabble_results();
CREATE FUNCTION public.tick_squabble_results()
RETURNS TABLE (closed INTEGER, queued INTEGER, requeued INTEGER) AS $$
BEGIN
  closed   := public.close_expired_squabbles();
  queued   := public.enqueue_result_notifications();
  requeued := public.requeue_stalled_notifications();
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.claim_result_notifications(INTEGER) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.requeue_stalled_notifications() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.tick_squabble_results() FROM anon, authenticated;
