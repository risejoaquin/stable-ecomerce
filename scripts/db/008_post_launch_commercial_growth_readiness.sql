-- Selfcare Sinners - POST-LAUNCH 02 Commercial Operations & Growth Readiness
-- Adds campaign tracking, review moderation, catalog readiness fields and commercial indexes.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS compare_at_price NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS supplier TEXT,
  ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS commercial_status TEXT DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS image_alt_text TEXT;

UPDATE products
SET low_stock_threshold = 5
WHERE low_stock_threshold IS NULL;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES users(id) ON DELETE SET NULL;

UPDATE reviews
SET moderation_status = COALESCE(moderation_status, 'approved');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reviews_moderation_status_check'
  ) THEN
    ALTER TABLE reviews
      ADD CONSTRAINT reviews_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS commercial_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'promotion',
  status TEXT NOT NULL DEFAULT 'draft',
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  budget NUMERIC(10,2),
  target_audience TEXT,
  channel TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'commercial_campaigns_status_check'
  ) THEN
    ALTER TABLE commercial_campaigns
      ADD CONSTRAINT commercial_campaigns_status_check
      CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  provider TEXT DEFAULT 'resend',
  provider_message_id TEXT,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commercial_campaigns_store_status
ON commercial_campaigns(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_product_moderation
ON reviews(product_id, moderation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_moderation_created_at
ON reviews(moderation_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_commercial_status
ON products(store_id, commercial_status, status);

CREATE INDEX IF NOT EXISTS idx_products_low_stock_threshold
ON products(store_id, status, stock, low_stock_threshold);

CREATE INDEX IF NOT EXISTS idx_email_events_created_at
ON email_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_order_id
ON email_events(order_id);

INSERT INTO commercial_campaigns(store_id, name, type, status, channel, notes, metadata)
SELECT
  s.id,
  'Launch baseline campaign',
  'launch',
  'draft',
  'storefront',
  'Baseline campaign created by POST-LAUNCH 02 migration. Activate only when catalog, stock, photos and policies are complete.',
  jsonb_build_object('source', '008_post_launch_commercial_growth_readiness')
FROM stores s
WHERE s.slug = 'selfcare-sinners'
  AND NOT EXISTS (
    SELECT 1 FROM commercial_campaigns c
    WHERE c.store_id = s.id
      AND c.name = 'Launch baseline campaign'
  );

INSERT INTO operational_events(event_type, severity, message, metadata)
VALUES (
  'post_launch_02_migration_applied',
  'info',
  'POST-LAUNCH 02 commercial operations and growth readiness migration applied.',
  jsonb_build_object('migration', '008_post_launch_commercial_growth_readiness')
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
