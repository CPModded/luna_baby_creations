-- Idempotency table for Stripe webhooks.
-- One row per processed Stripe event.id; ON CONFLICT DO NOTHING ensures we
-- never run the same event handler twice (Stripe retries events on 5xx).
-- See: app/api/webhooks/stripe/route.ts
CREATE TABLE IF NOT EXISTS processed_events (
  id TEXT PRIMARY KEY,
  "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS processed_events_received_at_idx ON processed_events ("receivedAt");
