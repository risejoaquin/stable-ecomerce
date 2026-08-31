-- ============================================================
-- POST-LAUNCH 14.1
-- Mobile PWA Schema Contract Consolidation Hotfix
-- Consolidates all production hotfixes applied during PL14 validation.
-- Safe/idempotent for Supabase/PostgREST.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Categories compatibility table for offline catalog
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'General',
  slug TEXT NOT NULL DEFAULT 'general',
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

INSERT INTO categories (store_id, name, slug, description, sort_order, is_active, metadata)
SELECT DISTINCT
  p.store_id,
  COALESCE(NULLIF(BTRIM(COALESCE(p.category, p.collection, p.brand, '')), ''), 'General') AS name,
  COALESCE(NULLIF(LOWER(REGEXP_REPLACE(COALESCE(p.category, p.collection, p.brand, ''), '[^a-zA-Z0-9]+', '-', 'g')), ''), 'general') AS slug,
  'Categoría generada desde catálogo de productos para compatibilidad PL14 offline-catalog.',
  0,
  TRUE,
  jsonb_build_object('source', 'PL14.1 consolidation', 'derivedFrom', 'products')
FROM products p
WHERE p.store_id IS NOT NULL
ON CONFLICT (store_id, slug)
DO UPDATE SET
  name = COALESCE(NULLIF(BTRIM(EXCLUDED.name), ''), categories.name, 'General'),
  is_active = TRUE,
  updated_at = NOW();

UPDATE categories
SET
  name = COALESCE(NULLIF(BTRIM(name), ''), 'General'),
  slug = COALESCE(NULLIF(BTRIM(slug), ''), 'general'),
  description = COALESCE(description, 'Categoría general generada para compatibilidad del catálogo offline PL14.'),
  is_active = COALESCE(is_active, TRUE),
  metadata = COALESCE(metadata, '{}'::jsonb),
  updated_at = NOW()
WHERE name IS NULL OR slug IS NULL OR BTRIM(name) = '' OR BTRIM(slug) = '';

CREATE INDEX IF NOT EXISTS idx_categories_store_active ON categories(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_store_sort ON categories(store_id, sort_order);

-- ============================================================
-- 2. mobile_install_events full backend contract
-- ============================================================
ALTER TABLE mobile_install_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS install_source TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'browser',
  ADD COLUMN IF NOT EXISTS standalone BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS prompt_outcome TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT,
  ADD COLUMN IF NOT EXISTS viewport_width INTEGER,
  ADD COLUMN IF NOT EXISTS viewport_height INTEGER;

UPDATE mobile_install_events
SET
  source = COALESCE(NULLIF(BTRIM(source), ''), install_source, platform, 'web'),
  install_source = COALESCE(NULLIF(BTRIM(install_source), ''), source, platform, 'web'),
  display_mode = COALESCE(NULLIF(BTRIM(display_mode), ''), 'browser'),
  standalone = COALESCE(standalone, FALSE),
  metadata = COALESCE(metadata, '{}'::jsonb);

CREATE INDEX IF NOT EXISTS idx_mobile_install_events_user_id ON mobile_install_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_install_events_source ON mobile_install_events(source);
CREATE INDEX IF NOT EXISTS idx_mobile_install_events_customer_email ON mobile_install_events(customer_email);
CREATE INDEX IF NOT EXISTS idx_mobile_install_events_session_id ON mobile_install_events(session_id);
CREATE INDEX IF NOT EXISTS idx_mobile_install_events_display_mode ON mobile_install_events(display_mode);

-- ============================================================
-- 3. mobile_checkout_events full backend contract
-- ============================================================
ALTER TABLE mobile_checkout_events
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'browser',
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cart_value NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT,
  ADD COLUMN IF NOT EXISTS abandoned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS conversion_status TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS friction_reason TEXT,
  ADD COLUMN IF NOT EXISTS friction_step TEXT,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS checkout_version TEXT,
  ADD COLUMN IF NOT EXISTS network_type TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recovered BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS viewport_width INTEGER,
  ADD COLUMN IF NOT EXISTS viewport_height INTEGER,
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT;

UPDATE mobile_checkout_events
SET
  source = COALESCE(NULLIF(BTRIM(source), ''), 'web'),
  display_mode = COALESCE(NULLIF(BTRIM(display_mode), ''), 'browser'),
  duration_ms = COALESCE(duration_ms, 0),
  cart_value = COALESCE(cart_value, 0),
  item_count = COALESCE(item_count, 0),
  abandoned = COALESCE(abandoned, FALSE),
  retry_count = COALESCE(retry_count, 0),
  recovered = COALESCE(recovered, FALSE),
  conversion_status = COALESCE(NULLIF(BTRIM(conversion_status), ''), CASE WHEN success = TRUE THEN 'completed' WHEN success = FALSE THEN 'failed' ELSE 'unknown' END),
  metadata = COALESCE(metadata, '{}'::jsonb);

CREATE INDEX IF NOT EXISTS idx_mobile_checkout_events_user_id ON mobile_checkout_events(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_checkout_events_customer_email ON mobile_checkout_events(customer_email);
CREATE INDEX IF NOT EXISTS idx_mobile_checkout_events_session_id ON mobile_checkout_events(session_id);
CREATE INDEX IF NOT EXISTS idx_mobile_checkout_events_conversion_status ON mobile_checkout_events(conversion_status);
CREATE INDEX IF NOT EXISTS idx_mobile_checkout_events_friction_reason ON mobile_checkout_events(friction_reason);
CREATE INDEX IF NOT EXISTS idx_mobile_checkout_events_friction_step ON mobile_checkout_events(friction_step);
CREATE INDEX IF NOT EXISTS idx_mobile_checkout_events_abandoned ON mobile_checkout_events(abandoned);

-- ============================================================
-- 4. web_push_subscriptions full backend contract + UPSERT support
-- ============================================================
ALTER TABLE web_push_subscriptions
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS device_id TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS display_mode TEXT DEFAULT 'browser',
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS browser TEXT,
  ADD COLUMN IF NOT EXISTS os TEXT,
  ADD COLUMN IF NOT EXISTS app_version TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

UPDATE web_push_subscriptions
SET
  endpoint = COALESCE(NULLIF(BTRIM(endpoint), ''), 'missing-endpoint-' || id::text),
  source = COALESCE(NULLIF(BTRIM(source), ''), platform, 'web'),
  platform = COALESCE(NULLIF(BTRIM(platform), ''), 'web'),
  display_mode = COALESCE(NULLIF(BTRIM(display_mode), ''), 'browser'),
  subscription_status = COALESCE(NULLIF(BTRIM(subscription_status), ''), CASE WHEN is_active = TRUE THEN 'active' ELSE 'inactive' END),
  last_seen_at = COALESCE(last_seen_at, updated_at, created_at, NOW()),
  metadata = COALESCE(metadata, '{}'::jsonb);

CREATE UNIQUE INDEX IF NOT EXISTS ux_web_push_subscriptions_endpoint ON web_push_subscriptions(endpoint);
CREATE UNIQUE INDEX IF NOT EXISTS ux_web_push_subscriptions_store_endpoint ON web_push_subscriptions(store_id, endpoint);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_source ON web_push_subscriptions(source);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_user_id ON web_push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_customer_email ON web_push_subscriptions(customer_email);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_session_id ON web_push_subscriptions(session_id);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_subscription_status ON web_push_subscriptions(subscription_status);

-- ============================================================
-- 5. mobile_app_readiness_checks full contract + UPSERT support
-- ============================================================
ALTER TABLE mobile_app_readiness_checks
  ADD COLUMN IF NOT EXISTS area TEXT DEFAULT 'mobile_pwa',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'readiness',
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS run_id UUID;

UPDATE mobile_app_readiness_checks
SET
  area = COALESCE(NULLIF(BTRIM(area), ''), 'mobile_pwa'),
  check_key = COALESCE(NULLIF(BTRIM(check_key), ''), 'check-' || id::text),
  check_name = COALESCE(NULLIF(BTRIM(check_name), ''), INITCAP(REPLACE(COALESCE(check_key, 'mobile_pwa_check'), '_', ' '))),
  category = COALESCE(NULLIF(BTRIM(category), ''), 'readiness'),
  severity = COALESCE(NULLIF(BTRIM(severity), ''), 'medium'),
  status = COALESCE(NULLIF(BTRIM(status), ''), 'pending'),
  priority = COALESCE(priority, 0),
  score = COALESCE(score, CASE WHEN status = 'pass' THEN 100 ELSE 0 END),
  passed = COALESCE(passed, status = 'pass'),
  recommendation = COALESCE(recommendation, 'Revisar este punto dentro del readiness móvil/PWA.'),
  details = COALESCE(details, '{}'::jsonb),
  metadata = COALESCE(metadata, '{}'::jsonb),
  checked_at = COALESCE(checked_at, NOW()),
  executed_at = COALESCE(executed_at, checked_at, created_at, NOW());

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id, area, check_key ORDER BY COALESCE(executed_at, checked_at, created_at) DESC, id DESC) AS rn
  FROM mobile_app_readiness_checks
)
DELETE FROM mobile_app_readiness_checks m USING ranked r WHERE m.id = r.id AND r.rn > 1;

WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY store_id, check_key ORDER BY COALESCE(executed_at, checked_at, created_at) DESC, id DESC) AS rn
  FROM mobile_app_readiness_checks
)
DELETE FROM mobile_app_readiness_checks m USING ranked r WHERE m.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS ux_mobile_app_readiness_store_area_check ON mobile_app_readiness_checks(store_id, area, check_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_mobile_app_readiness_store_check ON mobile_app_readiness_checks(store_id, check_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_mobile_app_readiness_area_check ON mobile_app_readiness_checks(area, check_key);
CREATE INDEX IF NOT EXISTS idx_mobile_app_readiness_checks_store_status ON mobile_app_readiness_checks(store_id, status);
CREATE INDEX IF NOT EXISTS idx_mobile_app_readiness_checks_area_status ON mobile_app_readiness_checks(area, status);
CREATE INDEX IF NOT EXISTS idx_mobile_app_readiness_checks_executed_at ON mobile_app_readiness_checks(executed_at DESC);

CREATE OR REPLACE FUNCTION normalize_mobile_app_readiness_checks()
RETURNS TRIGGER AS $$
BEGIN
  NEW.area := COALESCE(NULLIF(BTRIM(NEW.area), ''), 'mobile_pwa');
  NEW.category := COALESCE(NULLIF(BTRIM(NEW.category), ''), 'readiness');
  NEW.check_key := COALESCE(NULLIF(BTRIM(NEW.check_key), ''), 'check-' || COALESCE(NEW.id::text, uuid_generate_v4()::text));
  NEW.check_name := COALESCE(NULLIF(BTRIM(NEW.check_name), ''), INITCAP(REPLACE(NEW.check_key, '_', ' ')));
  NEW.status := COALESCE(NULLIF(BTRIM(NEW.status), ''), 'pending');
  NEW.severity := COALESCE(NULLIF(BTRIM(NEW.severity), ''), 'medium');
  NEW.priority := COALESCE(NEW.priority, 0);
  NEW.score := COALESCE(NEW.score, CASE WHEN NEW.status = 'pass' THEN 100 WHEN NEW.status = 'warning' THEN 60 WHEN NEW.status = 'fail' THEN 0 ELSE 0 END);
  NEW.passed := COALESCE(NEW.passed, NEW.status = 'pass');
  NEW.recommendation := COALESCE(NEW.recommendation, 'Revisar este punto dentro del readiness móvil/PWA.');
  NEW.details := COALESCE(NEW.details, '{}'::jsonb);
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
  NEW.checked_at := COALESCE(NEW.checked_at, NOW());
  NEW.executed_at := COALESCE(NEW.executed_at, NEW.checked_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_mobile_app_readiness_checks ON mobile_app_readiness_checks;
CREATE TRIGGER trg_normalize_mobile_app_readiness_checks
BEFORE INSERT OR UPDATE ON mobile_app_readiness_checks
FOR EACH ROW
EXECUTE FUNCTION normalize_mobile_app_readiness_checks();

NOTIFY pgrst, 'reload schema';
