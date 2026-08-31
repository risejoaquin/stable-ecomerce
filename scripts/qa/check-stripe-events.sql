-- Stripe webhook monitoring query.

SELECT id, type, processed_at, error_message, created_at
FROM stripe_events
ORDER BY created_at DESC
LIMIT 25;

SELECT
  COUNT(*) FILTER (WHERE processed_at IS NULL) AS unprocessed_events,
  COUNT(*) FILTER (WHERE error_message IS NOT NULL) AS events_with_error,
  COUNT(*) AS total_events
FROM stripe_events;
