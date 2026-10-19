-- Prepared schema only. Never apply to production without separate release approval.
-- Run as a dedicated backend owner. No PUBLIC/Data API access is granted.
CREATE SCHEMA IF NOT EXISTS relic_messaging;
REVOKE ALL ON SCHEMA relic_messaging FROM PUBLIC;
CREATE TABLE IF NOT EXISTS relic_messaging.conversations (
  scope text PRIMARY KEY,
  snapshot jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS relic_messaging.processed_events (
  scope text NOT NULL REFERENCES relic_messaging.conversations(scope),
  event_id text NOT NULL,
  fingerprint text NOT NULL,
  result jsonb NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, event_id)
);
CREATE TABLE IF NOT EXISTS relic_messaging.channel_bindings (
  channel text NOT NULL CHECK (channel IN ('instagram','messenger')),
  recipient_id text NOT NULL,
  store_id uuid NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel, recipient_id)
);
CREATE TABLE IF NOT EXISTS relic_messaging.carts (
  id text PRIMARY KEY,
  store_id uuid NOT NULL,
  customer_key text NOT NULL,
  conversation_scope text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','converted','cancelled')),
  items jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS relic_messaging_carts_customer_idx
  ON relic_messaging.carts (store_id, customer_key, updated_at DESC);
CREATE TABLE IF NOT EXISTS relic_messaging.tool_idempotency (
  store_id uuid NOT NULL,
  customer_key text NOT NULL,
  tool_name text NOT NULL,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, customer_key, tool_name, idempotency_key)
);
CREATE TABLE IF NOT EXISTS relic_messaging.order_links (
  order_id uuid PRIMARY KEY REFERENCES public.orders(id),
  store_id uuid NOT NULL,
  customer_key text NOT NULL,
  conversation_scope text NOT NULL,
  cart_id text REFERENCES relic_messaging.carts(id),
  idempotency_key text NOT NULL,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, customer_key, idempotency_key)
);
CREATE INDEX IF NOT EXISTS relic_messaging_order_links_customer_idx
  ON relic_messaging.order_links (store_id, customer_key, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS relic_messaging_one_order_per_cart_idx
  ON relic_messaging.order_links (store_id, customer_key, cart_id)
  WHERE cart_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS relic_messaging.outbound_messages (
  id text PRIMARY KEY,
  store_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('instagram','messenger')),
  conversation_id text NOT NULL,
  external_recipient_id text NOT NULL,
  related_inbound_event_id text,
  payload jsonb NOT NULL,
  payload_fingerprint text NOT NULL,
  status text NOT NULL CHECK (status IN ('QUEUED','SENDING','SENT','RETRYABLE_FAILURE','FAILED')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  provider_message_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (store_id, conversation_id, related_inbound_event_id)
);
CREATE INDEX IF NOT EXISTS relic_messaging_outbound_queue_idx
  ON relic_messaging.outbound_messages (status, updated_at);
REVOKE ALL ON ALL TABLES IN SCHEMA relic_messaging FROM PUBLIC;
