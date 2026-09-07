-- POST-LAUNCH 06 — Paid Traffic Readiness & Conversion Hardening
-- Safe migration for paid campaign landing pages, product feeds, ads/CAPI readiness and A/B testing.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE operational_events
  ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_id TEXT,
  ADD COLUMN IF NOT EXISTS google_analytics_measurement_id TEXT,
  ADD COLUMN IF NOT EXISTS default_campaign_coupon TEXT,
  ADD COLUMN IF NOT EXISTS paid_traffic_mode TEXT DEFAULT 'readiness';

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MXN',
  ADD COLUMN IF NOT EXISTS feed_status TEXT DEFAULT 'eligible',
  ADD COLUMN IF NOT EXISTS google_product_category TEXT DEFAULT 'Health & Beauty > Personal Care',
  ADD COLUMN IF NOT EXISTS landing_page_headline TEXT,
  ADD COLUMN IF NOT EXISTS landing_page_benefits JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS paid_traffic_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  commercial_campaign_id UUID REFERENCES commercial_campaigns(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'meta',
  objective TEXT NOT NULL DEFAULT 'conversions',
  status TEXT NOT NULL DEFAULT 'draft',
  budget_daily NUMERIC(12,2) DEFAULT 0,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  coupon_code TEXT,
  target_audience JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE TABLE IF NOT EXISTS campaign_landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES paid_traffic_campaigns(id) ON DELETE SET NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  hero_image_url TEXT,
  primary_cta TEXT DEFAULT 'Comprar ahora',
  secondary_cta TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  content JSONB DEFAULT '{}'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE TABLE IF NOT EXISTS product_feeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  feed_type TEXT NOT NULL DEFAULT 'meta_google',
  status TEXT NOT NULL DEFAULT 'generated',
  product_count INTEGER DEFAULT 0,
  invalid_count INTEGER DEFAULT 0,
  feed_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ad_platform_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  session_id TEXT,
  platform TEXT NOT NULL DEFAULT 'internal',
  event_name TEXT NOT NULL,
  event_id TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  value NUMERIC(12,2) DEFAULT 0,
  currency TEXT DEFAULT 'MXN',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT DEFAULT 'captured',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, event_id)
);

CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  experiment_key TEXT NOT NULL,
  name TEXT NOT NULL,
  hypothesis TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  target_path TEXT DEFAULT '/',
  primary_metric TEXT DEFAULT 'checkout_started',
  metadata JSONB DEFAULT '{}'::jsonb,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, experiment_key)
);

CREATE TABLE IF NOT EXISTS ab_test_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_key TEXT NOT NULL,
  name TEXT NOT NULL,
  weight NUMERIC(5,2) DEFAULT 50,
  config JSONB DEFAULT '{}'::jsonb,
  sort_order INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(test_id, variant_key)
);

CREATE TABLE IF NOT EXISTS checkout_optimization_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  session_id TEXT,
  event_type TEXT NOT NULL,
  friction_reason TEXT,
  step TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trust_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 100,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_paid_campaigns_store_status ON paid_traffic_campaigns(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_paid_campaigns_store_channel ON paid_traffic_campaigns(store_id, channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_pages_store_status ON campaign_landing_pages(store_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_feeds_store_generated ON product_feeds(store_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_store_platform_created ON ad_platform_events(store_id, platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_store_event_name_created ON ad_platform_events(store_id, event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ab_tests_store_status ON ab_tests(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_opt_events_store_created ON checkout_optimization_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_badges_store_visible_sort ON trust_badges(store_id, is_visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_products_feed_readiness ON products(store_id, status, feed_status, stock);

INSERT INTO trust_badges(store_id, badge_key, label, description, icon, sort_order)
SELECT id, 'secure_checkout', 'Checkout seguro', 'Pagos procesados con Stripe y protección de datos.', 'lock', 10
FROM stores
ON CONFLICT(store_id, badge_key) DO NOTHING;

INSERT INTO trust_badges(store_id, badge_key, label, description, icon, sort_order)
SELECT id, 'order_tracking', 'Seguimiento de pedido', 'Consulta el estado de tu compra desde la página de rastreo.', 'truck', 20
FROM stores
ON CONFLICT(store_id, badge_key) DO NOTHING;

INSERT INTO trust_badges(store_id, badge_key, label, description, icon, sort_order)
SELECT id, 'human_support', 'Soporte humano', 'Atención por contacto y soporte para dudas de compra.', 'heart', 30
FROM stores
ON CONFLICT(store_id, badge_key) DO NOTHING;

INSERT INTO paid_traffic_campaigns(store_id, name, slug, channel, objective, status, budget_daily, utm_source, utm_medium, utm_campaign, metadata)
SELECT id, 'Skincare Launch Campaign', 'skincare-launch', 'meta', 'conversions', 'active', 0, 'meta', 'paid_social', 'skincare-launch', '{"source":"012_seed"}'::jsonb
FROM stores
ON CONFLICT(store_id, slug) DO NOTHING;

INSERT INTO campaign_landing_pages(store_id, campaign_id, slug, title, subtitle, primary_cta, status, content, seo_title, seo_description)
SELECT s.id, c.id, 'skincare-launch', 'Skincare seleccionado para tu rutina', 'Compra productos de autocuidado con checkout seguro, soporte y seguimiento de pedido.', 'Comprar skincare', 'published',
  '{"trustBadges":["Checkout seguro","Seguimiento de pedido","Soporte humano"],"sections":[{"title":"Compra con confianza","body":"Landing preparada para tráfico pagado y campañas UTM."}]}'::jsonb,
  'Skincare Selfcare Sinners | Compra segura', 'Landing de campaña Selfcare Sinners con productos de skincare, checkout seguro y seguimiento de pedido.'
FROM stores s
JOIN paid_traffic_campaigns c ON c.store_id = s.id AND c.slug = 'skincare-launch'
ON CONFLICT(store_id, slug) DO NOTHING;

INSERT INTO ab_tests(store_id, experiment_key, name, hypothesis, status, target_path, primary_metric)
SELECT id, 'home_hero_v1', 'Home Hero Trust Test', 'Un hero con confianza y seguimiento mejora checkout_started.', 'active', '/', 'checkout_started'
FROM stores
ON CONFLICT(store_id, experiment_key) DO NOTHING;

INSERT INTO ab_test_variants(test_id, variant_key, name, weight, config, sort_order)
SELECT t.id, 'control', 'Control', 50, '{"headline":"Selfcare Sinners"}'::jsonb, 10
FROM ab_tests t
WHERE t.experiment_key = 'home_hero_v1'
ON CONFLICT(test_id, variant_key) DO NOTHING;

INSERT INTO ab_test_variants(test_id, variant_key, name, weight, config, sort_order)
SELECT t.id, 'trust', 'Trust hero', 50, '{"headline":"Skincare con compra segura","badges":["Pago seguro","Seguimiento","Soporte"]}'::jsonb, 20
FROM ab_tests t
WHERE t.experiment_key = 'home_hero_v1'
ON CONFLICT(test_id, variant_key) DO NOTHING;

INSERT INTO product_feeds(store_id, feed_type, status, product_count, invalid_count, feed_url, metadata)
SELECT s.id, 'meta_google', 'generated', COUNT(p.id), COUNT(p.id) FILTER (WHERE p.image_url IS NULL OR p.image_alt_text IS NULL OR p.stock <= 0 OR p.slug IS NULL), 'https://selfcaresinners.com/api/public/product-feed', '{"source":"012_seed"}'::jsonb
FROM stores s
LEFT JOIN products p ON p.store_id = s.id AND p.status = 'active'
GROUP BY s.id
ON CONFLICT DO NOTHING;

INSERT INTO operational_events(store_id, event_type, severity, message, metadata)
SELECT id, 'post_launch_06_migration_applied', 'info', 'POST-LAUNCH 06 paid traffic readiness and conversion hardening migration applied.', '{}'::jsonb
FROM stores
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
