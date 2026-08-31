-- Selfcare Sinners - POST-LAUNCH 03
-- Brand, Catalog & Conversion Optimization

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS collection TEXT,
  ADD COLUMN IF NOT EXISTS short_marketing_copy TEXT,
  ADD COLUMN IF NOT EXISTS hero_badge TEXT,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sort_priority INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS launch_ready_at TIMESTAMP WITH TIME ZONE;

UPDATE products
SET
  image_alt_text = COALESCE(NULLIF(image_alt_text, ''), name || ' en Selfcare Sinners'),
  short_marketing_copy = COALESCE(short_marketing_copy, description, long_description),
  commercial_status = COALESCE(commercial_status, 'ready'),
  sort_priority = COALESCE(sort_priority, 100),
  launch_ready_at = COALESCE(launch_ready_at, NOW()),
  updated_at = NOW()
WHERE status = 'active';

CREATE TABLE IF NOT EXISTS marketing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  session_id TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES commercial_campaigns(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  source TEXT DEFAULT 'storefront',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_media_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt_text TEXT,
  media_type TEXT DEFAULT 'image',
  sort_order INTEGER DEFAULT 100,
  is_primary BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS category_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 100,
  is_visible BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE TABLE IF NOT EXISTS landing_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title TEXT,
  subtitle TEXT,
  body TEXT,
  image_url TEXT,
  cta_label TEXT,
  cta_url TEXT,
  sort_order INTEGER DEFAULT 100,
  is_visible BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_marketing_events_store_created_at
ON marketing_events(store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_events_event_type_created_at
ON marketing_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_events_product_created_at
ON marketing_events(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_store_featured_sort
ON products(store_id, status, is_featured DESC, sort_priority ASC, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_store_commercial_status
ON products(store_id, commercial_status, status);

CREATE INDEX IF NOT EXISTS idx_category_collections_store_visible_sort
ON category_collections(store_id, is_visible, sort_order);

CREATE INDEX IF NOT EXISTS idx_landing_sections_store_visible_sort
ON landing_sections(store_id, is_visible, sort_order);

INSERT INTO category_collections(store_id, name, slug, description, sort_order, is_visible, metadata)
SELECT DISTINCT
  p.store_id,
  p.category,
  lower(regexp_replace(regexp_replace(p.category, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')),
  'Colección comercial generada desde el catálogo activo.',
  100,
  TRUE,
  jsonb_build_object('source', '009_post_launch_03_brand_catalog_conversion_optimization')
FROM products p
WHERE p.category IS NOT NULL
  AND trim(p.category) <> ''
ON CONFLICT(store_id, slug) DO NOTHING;

INSERT INTO landing_sections(store_id, section_key, title, subtitle, body, cta_label, cta_url, sort_order, is_visible, metadata)
SELECT
  s.id,
  'hero_primary',
  'Skincare curado para una rutina que sí puedes sostener.',
  'Selfcare Sinners',
  'Productos seleccionados, compra segura, seguimiento claro y una experiencia pensada para decidir rápido sin perder confianza.',
  'Comprar ahora',
  '/#catalogo',
  10,
  TRUE,
  jsonb_build_object('source', '009_post_launch_03_brand_catalog_conversion_optimization')
FROM stores s
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT(store_id, section_key) DO NOTHING;

INSERT INTO operational_events(event_type, severity, message, metadata)
VALUES (
  'post_launch_03_migration_applied',
  'info',
  'POST-LAUNCH 03 brand, catalog and conversion optimization migration applied.',
  jsonb_build_object('phase', 'POST-LAUNCH 03')
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
