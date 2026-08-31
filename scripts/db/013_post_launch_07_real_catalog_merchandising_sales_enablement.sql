-- POST-LAUNCH 07 — Real Catalog Import, Merchandising & Sales Enablement
-- Safe/idempotent migration for production Supabase.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE operational_events
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS margin_percent NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS merchandising_priority INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS promo_badge TEXT,
  ADD COLUMN IF NOT EXISTS ready_for_ads BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS catalog_quality_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS catalog_validation_issues JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_catalog_reviewed_at TIMESTAMP WITH TIME ZONE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_store_slug_unique
ON products(store_id, slug)
WHERE slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS catalog_import_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  file_name TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  total_rows INTEGER DEFAULT 0,
  valid_rows INTEGER DEFAULT 0,
  invalid_rows INTEGER DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catalog_import_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id UUID NOT NULL REFERENCES catalog_import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  validation_status TEXT NOT NULL DEFAULT 'pending',
  errors JSONB DEFAULT '[]'::jsonb,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_publish_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  issues JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id)
);

CREATE TABLE IF NOT EXISTS merchandising_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  title TEXT NOT NULL,
  priority INTEGER DEFAULT 100,
  conditions JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, rule_key)
);

ALTER TABLE category_collections
  ADD COLUMN IF NOT EXISTS hero_title TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS cta_label TEXT DEFAULT 'Comprar colección',
  ADD COLUMN IF NOT EXISTS cta_url TEXT;

ALTER TABLE product_media_assets
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS optimized_url TEXT,
  ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER,
  ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_catalog_import_batches_store_created_at
ON catalog_import_batches(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_catalog_import_rows_batch_status
ON catalog_import_rows(batch_id, validation_status);

CREATE INDEX IF NOT EXISTS idx_product_publish_checks_store_status
ON product_publish_checks(store_id, status, score DESC);

CREATE INDEX IF NOT EXISTS idx_merchandising_rules_store_active_priority
ON merchandising_rules(store_id, is_active, priority);

CREATE INDEX IF NOT EXISTS idx_products_store_merchandising
ON products(store_id, status, is_featured DESC, merchandising_priority ASC, sort_priority ASC);

CREATE INDEX IF NOT EXISTS idx_products_store_ready_ads
ON products(store_id, ready_for_ads, catalog_quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_product_media_assets_quality
ON product_media_assets(quality_status, is_primary);

-- Backfill product image_url from existing images array when available.
UPDATE products
SET image_url = COALESCE(image_url, images->>0),
    merchandising_priority = COALESCE(merchandising_priority, sort_priority, 100),
    promo_badge = COALESCE(promo_badge, hero_badge),
    margin_percent = CASE
      WHEN margin_percent IS NULL AND cost IS NOT NULL AND price IS NOT NULL AND price::numeric > 0
      THEN ROUND(((price::numeric - cost::numeric) / price::numeric) * 100, 2)
      ELSE margin_percent
    END,
    updated_at = NOW()
WHERE image_url IS NULL
   OR merchandising_priority IS NULL
   OR promo_badge IS NULL
   OR margin_percent IS NULL;

-- Seed merchandising rules.
INSERT INTO merchandising_rules(store_id, rule_key, title, priority, conditions, actions, is_active, metadata)
SELECT id, 'featured-first', 'Productos destacados primero', 10,
       '{"field":"is_featured","equals":true}'::jsonb,
       '{"sort":"featured_first"}'::jsonb,
       TRUE,
       '{"source":"post_launch_07"}'::jsonb
FROM stores
WHERE slug = 'selfcare-sinners'
ON CONFLICT (store_id, rule_key) DO NOTHING;

INSERT INTO merchandising_rules(store_id, rule_key, title, priority, conditions, actions, is_active, metadata)
SELECT id, 'ready-for-ads', 'Productos listos para campañas', 20,
       '{"field":"ready_for_ads","equals":true}'::jsonb,
       '{"surface":"paid_landing"}'::jsonb,
       TRUE,
       '{"source":"post_launch_07"}'::jsonb
FROM stores
WHERE slug = 'selfcare-sinners'
ON CONFLICT (store_id, rule_key) DO NOTHING;

-- Refresh catalog QA score for existing products.
INSERT INTO product_publish_checks(store_id, product_id, score, issues, status, checked_at)
SELECT
  p.store_id,
  p.id,
  GREATEST(0, 100 - (
    (CASE WHEN p.name IS NULL OR p.name = '' THEN 10 ELSE 0 END) +
    (CASE WHEN p.slug IS NULL OR p.slug = '' THEN 10 ELSE 0 END) +
    (CASE WHEN p.price IS NULL OR p.price <= 0 THEN 10 ELSE 0 END) +
    (CASE WHEN p.stock IS NULL OR p.stock <= 0 THEN 10 ELSE 0 END) +
    (CASE WHEN p.category IS NULL AND (p.categories IS NULL OR jsonb_array_length(p.categories) = 0) THEN 10 ELSE 0 END) +
    (CASE WHEN p.image_url IS NULL AND (p.images IS NULL OR jsonb_array_length(p.images) = 0) THEN 10 ELSE 0 END) +
    (CASE WHEN p.image_alt_text IS NULL OR p.image_alt_text = '' THEN 10 ELSE 0 END) +
    (CASE WHEN p.seo_title IS NULL OR p.seo_title = '' THEN 10 ELSE 0 END) +
    (CASE WHEN p.seo_description IS NULL OR p.seo_description = '' THEN 10 ELSE 0 END)
  )) AS score,
  jsonb_build_array() AS issues,
  CASE WHEN p.status = 'active' THEN 'reviewed' ELSE 'draft' END,
  NOW()
FROM products p
ON CONFLICT (product_id) DO UPDATE SET
  score = EXCLUDED.score,
  status = EXCLUDED.status,
  checked_at = NOW();

UPDATE products p
SET catalog_quality_score = pc.score,
    ready_for_ads = (pc.score >= 80 AND p.status = 'active' AND COALESCE(p.stock,0) > 0),
    last_catalog_reviewed_at = NOW(),
    updated_at = NOW()
FROM product_publish_checks pc
WHERE pc.product_id = p.id;

INSERT INTO operational_events(store_id, event_type, severity, message, metadata)
SELECT id,
       'post_launch_07_migration_applied',
       'info',
       'POST-LAUNCH 07 catalog, merchandising and sales enablement migration applied.',
       '{"phase":"POST-LAUNCH 07"}'::jsonb
FROM stores
WHERE slug = 'selfcare-sinners';

NOTIFY pgrst, 'reload schema';
