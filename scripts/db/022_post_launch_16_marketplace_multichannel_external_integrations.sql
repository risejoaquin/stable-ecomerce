-- ============================================================
-- POST-LAUNCH 16
-- Marketplace Expansion, Multi-Channel Sales & External Integrations
-- Safe/idempotent for Supabase/PostgREST.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS sales_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  channel_key TEXT NOT NULL,
  name TEXT NOT NULL,
  channel_type TEXT NOT NULL DEFAULT 'marketplace',
  platform TEXT NOT NULL DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'draft',
  is_active BOOLEAN DEFAULT TRUE,
  currency TEXT DEFAULT 'MXN',
  locale TEXT DEFAULT 'es-MX',
  base_url TEXT,
  external_account_id TEXT,
  config JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, channel_key)
);

CREATE TABLE IF NOT EXISTS channel_product_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL,
  channel_key TEXT NOT NULL,
  feed_type TEXT NOT NULL DEFAULT 'product_catalog',
  feed_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  product_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  payload JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, channel_key, feed_type)
);

CREATE TABLE IF NOT EXISTS channel_inventory_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL,
  channel_key TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT,
  available_stock INTEGER DEFAULT 0,
  reserved_stock INTEGER DEFAULT 0,
  external_stock INTEGER DEFAULT 0,
  sync_status TEXT DEFAULT 'pending',
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, channel_key, product_id)
);

CREATE TABLE IF NOT EXISTS external_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL,
  channel_key TEXT NOT NULL,
  external_order_id TEXT NOT NULL,
  order_number TEXT,
  status TEXT DEFAULT 'imported',
  financial_status TEXT DEFAULT 'pending',
  fulfillment_status TEXT DEFAULT 'unfulfilled',
  customer_email TEXT,
  total_amount NUMERIC(10,2) DEFAULT 0,
  currency TEXT DEFAULT 'MXN',
  ordered_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, channel_key, external_order_id)
);

CREATE TABLE IF NOT EXISTS external_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  external_order_id UUID REFERENCES external_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  external_product_id TEXT,
  sku TEXT,
  name TEXT NOT NULL DEFAULT 'External order item',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_sync_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL,
  channel_key TEXT NOT NULL,
  sync_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'completed',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  records_processed INTEGER DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_pricing_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL,
  channel_key TEXT NOT NULL,
  rule_key TEXT NOT NULL,
  name TEXT NOT NULL,
  adjustment_type TEXT DEFAULT 'none',
  adjustment_value NUMERIC(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, channel_key, rule_key)
);

CREATE TABLE IF NOT EXISTS channel_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  channel_id UUID REFERENCES sales_channels(id) ON DELETE SET NULL,
  channel_key TEXT NOT NULL,
  period TEXT NOT NULL DEFAULT TO_CHAR(NOW(), 'YYYY-MM'),
  gross_revenue NUMERIC(10,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  feed_product_count INTEGER DEFAULT 0,
  synced_product_count INTEGER DEFAULT 0,
  average_order_value NUMERIC(10,2) DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, channel_key, period)
);

CREATE INDEX IF NOT EXISTS idx_sales_channels_store_active ON sales_channels(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_channel_product_feeds_store_channel ON channel_product_feeds(store_id, channel_key);
CREATE INDEX IF NOT EXISTS idx_channel_inventory_snapshots_store_channel ON channel_inventory_snapshots(store_id, channel_key);
CREATE INDEX IF NOT EXISTS idx_external_orders_store_channel ON external_orders(store_id, channel_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_order_items_external_order ON external_order_items(external_order_id);
CREATE INDEX IF NOT EXISTS idx_channel_sync_events_store_channel ON channel_sync_events(store_id, channel_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_channel_pricing_rules_store_channel ON channel_pricing_rules(store_id, channel_key, is_active);
CREATE INDEX IF NOT EXISTS idx_channel_performance_snapshots_store_period ON channel_performance_snapshots(store_id, period DESC);

-- Seed configurable sales channels for current store.
INSERT INTO sales_channels (store_id, channel_key, name, channel_type, platform, status, is_active, config, metadata)
SELECT s.id, item.channel_key, item.name, item.channel_type, item.platform, 'ready', TRUE,
       jsonb_build_object('exportable', true, 'inventorySync', true),
       jsonb_build_object('source', 'PL16 seed')
FROM stores s
CROSS JOIN (
  VALUES
    ('website', 'Selfcare Sinners Website', 'direct', 'website'),
    ('meta_catalog', 'Meta Catalog', 'social_commerce', 'meta'),
    ('google_merchant', 'Google Merchant Center', 'shopping', 'google'),
    ('tiktok_catalog', 'TikTok Catalog', 'social_commerce', 'tiktok'),
    ('marketplace_custom', 'Marketplace Custom', 'marketplace', 'custom')
) AS item(channel_key, name, channel_type, platform)
WHERE s.slug = COALESCE(NULLIF(current_setting('app.primary_store_slug', true), ''), 'selfcare-sinners')
   OR s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, channel_key)
DO UPDATE SET
  name = EXCLUDED.name,
  channel_type = EXCLUDED.channel_type,
  platform = EXCLUDED.platform,
  is_active = TRUE,
  status = COALESCE(sales_channels.status, 'ready'),
  updated_at = NOW();

-- Seed base pricing rules.
INSERT INTO channel_pricing_rules (store_id, channel_id, channel_key, rule_key, name, adjustment_type, adjustment_value, metadata)
SELECT sc.store_id, sc.id, sc.channel_key, 'base_price', 'Precio base por canal', 'none', 0,
       jsonb_build_object('source', 'PL16 seed')
FROM sales_channels sc
ON CONFLICT (store_id, channel_key, rule_key)
DO UPDATE SET updated_at = NOW();

-- Seed baseline performance snapshots.
INSERT INTO channel_performance_snapshots (store_id, channel_id, channel_key, period, feed_product_count, synced_product_count, metadata)
SELECT sc.store_id, sc.id, sc.channel_key, TO_CHAR(NOW(), 'YYYY-MM'),
       COALESCE((SELECT COUNT(*) FROM products p WHERE p.store_id = sc.store_id), 0),
       0,
       jsonb_build_object('source', 'PL16 seed')
FROM sales_channels sc
ON CONFLICT (store_id, channel_key, period)
DO UPDATE SET
  feed_product_count = EXCLUDED.feed_product_count,
  generated_at = NOW();

NOTIFY pgrst, 'reload schema';
