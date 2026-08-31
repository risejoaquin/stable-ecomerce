-- POST-LAUNCH 14 — Mobile Experience, PWA Hardening & App-Like Commerce
-- Safe/idempotent migration for Supabase/PostgreSQL.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS mobile_pwa_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  device_type TEXT DEFAULT 'mobile',
  platform TEXT DEFAULT 'web',
  display_mode TEXT DEFAULT 'browser',
  is_standalone BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_install_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'install_prompt_seen',
  platform TEXT DEFAULT 'web',
  display_mode TEXT DEFAULT 'browser',
  accepted BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'pwa',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_offline_catalog_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  snapshot_key TEXT NOT NULL DEFAULT 'default_catalog',
  version INTEGER DEFAULT 1,
  product_count INTEGER DEFAULT 0,
  category_count INTEGER DEFAULT 0,
  cache_strategy TEXT DEFAULT 'network_first_catalog_fallback',
  status TEXT DEFAULT 'active',
  payload JSONB DEFAULT '{}'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_checkout_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'mobile_checkout_started',
  step TEXT DEFAULT 'cart',
  device_type TEXT DEFAULT 'mobile',
  success BOOLEAN DEFAULT FALSE,
  duration_ms INTEGER DEFAULT 0,
  friction_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS web_push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT,
  auth TEXT,
  permission_status TEXT DEFAULT 'default',
  is_active BOOLEAN DEFAULT TRUE,
  source TEXT DEFAULT 'mobile_pwa',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_touch_optimization_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  event_key TEXT NOT NULL DEFAULT 'touch_target_audit',
  page_path TEXT DEFAULT '/',
  metric_name TEXT DEFAULT 'tap_target_readiness',
  score NUMERIC(10,2) DEFAULT 100,
  status TEXT DEFAULT 'ok',
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  snapshot_key TEXT NOT NULL DEFAULT encode(gen_random_bytes(8), 'hex'),
  page_path TEXT DEFAULT '/',
  device_type TEXT DEFAULT 'mobile',
  lcp_ms INTEGER DEFAULT 0,
  fid_ms INTEGER DEFAULT 0,
  cls NUMERIC(10,4) DEFAULT 0,
  ttfb_ms INTEGER DEFAULT 0,
  score NUMERIC(10,2) DEFAULT 100,
  status TEXT DEFAULT 'ok',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_retention_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL DEFAULT 'mobile_return_visit',
  channel TEXT DEFAULT 'pwa',
  source TEXT DEFAULT 'home_screen',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mobile_app_readiness_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  check_key TEXT NOT NULL,
  area TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready',
  score NUMERIC(10,2) DEFAULT 100,
  recommendation TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_pwa_sessions_session_key ON mobile_pwa_sessions(session_key);
CREATE INDEX IF NOT EXISTS idx_mobile_install_events_store_created_at ON mobile_install_events(store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_offline_catalog_snapshots_store_key ON mobile_offline_catalog_snapshots(store_id, snapshot_key);
CREATE INDEX IF NOT EXISTS idx_mobile_checkout_events_store_created_at ON mobile_checkout_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_push_subscriptions_store_active ON web_push_subscriptions(store_id, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS idx_web_push_subscriptions_endpoint ON web_push_subscriptions(endpoint);
CREATE INDEX IF NOT EXISTS idx_mobile_touch_events_store_created_at ON mobile_touch_optimization_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_performance_store_created_at ON mobile_performance_snapshots(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mobile_retention_store_created_at ON mobile_retention_events(store_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mobile_app_readiness_store_check ON mobile_app_readiness_checks(store_id, check_key);

INSERT INTO mobile_app_readiness_checks (store_id, check_key, area, status, score, recommendation, metadata)
SELECT s.id, item.check_key, item.area, 'ready', item.score, item.recommendation,
       jsonb_build_object('source','020_post_launch_14_mobile_pwa_app_like_commerce')
FROM stores s
CROSS JOIN (VALUES
  ('manifest_installable', 'pwa', 100, 'Manifest installable con iconos y start_url.'),
  ('service_worker_same_origin', 'pwa', 100, 'Service worker restringido a same-origin y catálogo offline-lite.'),
  ('mobile_checkout', 'checkout', 95, 'Checkout móvil listo para validación de fricción.'),
  ('touch_targets', 'ux', 95, 'Optimización táctil base lista.'),
  ('web_push_base', 'retention', 90, 'Base de suscripciones web push lista, envío futuro requiere provider.'),
  ('future_app_readiness', 'mobile_app', 90, 'Base PWA compatible con evolución a app futura.')
) AS item(check_key, area, score, recommendation)
WHERE s.slug = COALESCE(current_setting('app.primary_store_slug', true), 'selfcare-sinners')
ON CONFLICT (store_id, check_key) DO UPDATE SET
  status = EXCLUDED.status,
  score = EXCLUDED.score,
  recommendation = EXCLUDED.recommendation,
  checked_at = NOW();

INSERT INTO mobile_offline_catalog_snapshots (store_id, snapshot_key, version, product_count, category_count, cache_strategy, status, payload)
SELECT s.id, 'default_catalog', 1,
       (SELECT COUNT(*) FROM products p WHERE p.store_id = s.id),
       (SELECT COUNT(*) FROM categories c WHERE c.store_id = s.id),
       'network_first_catalog_fallback',
       'active',
       jsonb_build_object('source','020_post_launch_14_mobile_pwa_app_like_commerce')
FROM stores s
WHERE s.slug = COALESCE(current_setting('app.primary_store_slug', true), 'selfcare-sinners')
ON CONFLICT (store_id, snapshot_key) DO UPDATE SET
  version = mobile_offline_catalog_snapshots.version + 1,
  product_count = EXCLUDED.product_count,
  category_count = EXCLUDED.category_count,
  payload = EXCLUDED.payload,
  generated_at = NOW();

NOTIFY pgrst, 'reload schema';
