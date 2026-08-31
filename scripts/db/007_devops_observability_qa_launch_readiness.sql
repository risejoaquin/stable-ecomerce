-- Selfcare Sinners - SUPERFASE F
-- DevOps, observability, QA, backup and launch readiness support.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS operational_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operational_events_created_at
ON operational_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_event_type
ON operational_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operational_events_severity_created_at
ON operational_events(severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stripe_events_processed_error
ON stripe_events(processed_at, error_message, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status_updated_at
ON orders(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order_created_at
ON inventory_movements(order_id, created_at DESC);

INSERT INTO operational_events(event_type, severity, message, metadata)
VALUES (
  'phase_f_migration_applied',
  'info',
  'SUPERFASE F observability and launch readiness migration applied.',
  jsonb_build_object('source', '007_devops_observability_qa_launch_readiness')
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
