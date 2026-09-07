-- ============================================================
-- POST-LAUNCH 19 — Performance, Load Testing & Cost Optimization
-- Selfcare Sinners Ecommerce
-- ============================================================
-- Objetivo:
-- - pruebas de carga
-- - optimización Supabase/Railway
-- - query profiling
-- - índices para alto volumen
-- - caché avanzado
-- - cost control
-- - resource usage alerts
-- - slow query reports
-- - optimización de endpoints admin
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS performance_test_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  run_key TEXT NOT NULL,
  scenario_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  target_base_url TEXT,
  concurrent_users INTEGER DEFAULT 1,
  duration_seconds INTEGER DEFAULT 30,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  p50_ms INTEGER DEFAULT 0,
  p95_ms INTEGER DEFAULT 0,
  p99_ms INTEGER DEFAULT 0,
  error_rate NUMERIC(10,4) DEFAULT 0,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS endpoint_performance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  p50_ms INTEGER DEFAULT 0,
  p95_ms INTEGER DEFAULT 0,
  p99_ms INTEGER DEFAULT 0,
  avg_ms INTEGER DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_rate NUMERIC(10,4) DEFAULT 0,
  performance_status TEXT DEFAULT 'unknown',
  optimization_notes TEXT,
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS query_profile_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  profile_key TEXT NOT NULL,
  query_name TEXT NOT NULL,
  table_name TEXT,
  duration_ms INTEGER DEFAULT 0,
  rows_scanned INTEGER DEFAULT 0,
  rows_returned INTEGER DEFAULT 0,
  index_used BOOLEAN DEFAULT FALSE,
  optimization_status TEXT DEFAULT 'unknown',
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  profiled_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS slow_query_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  report_key TEXT NOT NULL,
  query_name TEXT NOT NULL,
  table_name TEXT,
  duration_ms INTEGER DEFAULT 0,
  threshold_ms INTEGER DEFAULT 500,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  recommendation TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cache_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  metric_key TEXT NOT NULL,
  cache_area TEXT NOT NULL,
  hit_count INTEGER DEFAULT 0,
  miss_count INTEGER DEFAULT 0,
  hit_rate NUMERIC(10,4) DEFAULT 0,
  ttl_seconds INTEGER DEFAULT 0,
  cache_status TEXT DEFAULT 'unknown',
  recommendation TEXT,
  analyzed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  analyzed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  snapshot_key TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'railway_supabase',
  monthly_estimate NUMERIC(10,2) DEFAULT 0,
  railway_estimate NUMERIC(10,2) DEFAULT 0,
  supabase_estimate NUMERIC(10,2) DEFAULT 0,
  bandwidth_gb NUMERIC(10,2) DEFAULT 0,
  storage_gb NUMERIC(10,2) DEFAULT 0,
  request_count INTEGER DEFAULT 0,
  cost_status TEXT DEFAULT 'unknown',
  recommendation TEXT,
  captured_by UUID REFERENCES users(id) ON DELETE SET NULL,
  captured_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resource_usage_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  alert_key TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  current_value NUMERIC(12,4) DEFAULT 0,
  threshold_value NUMERIC(12,4) DEFAULT 0,
  severity TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  recommendation TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_endpoint_optimization_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  check_key TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS railway_optimization_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  check_key TEXT NOT NULL,
  check_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supabase_optimization_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  check_key TEXT NOT NULL,
  check_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS load_test_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  scenario_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_endpoints JSONB DEFAULT '[]'::jsonb,
  concurrent_users INTEGER DEFAULT 1,
  duration_seconds INTEGER DEFAULT 30,
  status TEXT DEFAULT 'active',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraints required for UPSERTs
CREATE UNIQUE INDEX IF NOT EXISTS ux_performance_test_runs_store_run_key ON performance_test_runs(store_id, run_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_query_profile_events_store_profile_key ON query_profile_events(store_id, profile_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_slow_query_reports_store_report_key ON slow_query_reports(store_id, report_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cache_metrics_store_metric_key ON cache_metrics(store_id, metric_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_cost_snapshots_store_snapshot_key ON cost_snapshots(store_id, snapshot_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_resource_usage_alerts_store_alert_key ON resource_usage_alerts(store_id, alert_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_admin_endpoint_optimization_store_check ON admin_endpoint_optimization_checks(store_id, check_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_railway_optimization_store_check ON railway_optimization_checks(store_id, check_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_supabase_optimization_store_check ON supabase_optimization_checks(store_id, check_key);
CREATE UNIQUE INDEX IF NOT EXISTS ux_load_test_scenarios_store_scenario ON load_test_scenarios(store_id, scenario_key);

-- Operational indexes
CREATE INDEX IF NOT EXISTS idx_endpoint_performance_store_endpoint ON endpoint_performance_snapshots(store_id, endpoint, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_endpoint_performance_status ON endpoint_performance_snapshots(performance_status);
CREATE INDEX IF NOT EXISTS idx_performance_test_runs_store_created ON performance_test_runs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_profile_events_store_created ON query_profile_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slow_query_reports_status ON slow_query_reports(status, severity);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_area ON cache_metrics(cache_area, cache_status);
CREATE INDEX IF NOT EXISTS idx_cost_snapshots_provider ON cost_snapshots(provider, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_resource_usage_alerts_status ON resource_usage_alerts(status, severity);

-- Seed baseline scenarios and checks
INSERT INTO load_test_scenarios (store_id, scenario_key, name, description, target_endpoints, concurrent_users, duration_seconds, status, metadata)
SELECT s.id, v.scenario_key, v.name, v.description, v.target_endpoints::jsonb, v.concurrent_users, v.duration_seconds, 'active', jsonb_build_object('source','PL19 seed')
FROM stores s
CROSS JOIN (VALUES
  ('public_storefront_baseline','Public storefront baseline','Health, home, product and catalog public endpoints','["/api/health","/api/products","/api/mobile/offline-catalog"]',5,60),
  ('admin_operational_baseline','Admin operational baseline','Admin diagnostics and summary endpoints','["/api/admin/diagnostics","/api/admin/performance/summary"]',2,45),
  ('checkout_readiness_baseline','Checkout readiness baseline','Mobile checkout and payment readiness endpoints','["/api/admin/mobile-pwa/checkout-readiness","/api/admin/performance/endpoints"]',3,45)
) AS v(scenario_key, name, description, target_endpoints, concurrent_users, duration_seconds)
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, scenario_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  target_endpoints = EXCLUDED.target_endpoints,
  concurrent_users = EXCLUDED.concurrent_users,
  duration_seconds = EXCLUDED.duration_seconds,
  updated_at = NOW();

INSERT INTO railway_optimization_checks (store_id, check_key, check_name, status, score, recommendation, metadata)
SELECT s.id, v.check_key, v.check_name, v.status, v.score, v.recommendation, jsonb_build_object('source','PL19 seed')
FROM stores s
CROSS JOIN (VALUES
  ('health_latency','Railway health latency','pass',100,'Mantener monitoreo de /api/health y readiness antes de subir tráfico.'),
  ('deployment_cost','Railway deployment cost control','warning',75,'Revisar plan Railway si suben concurrencia o jobs automáticos.'),
  ('runtime_capacity','Railway runtime capacity','warning',75,'Ejecutar load tests antes de campañas con tráfico pagado fuerte.')
) AS v(check_key, check_name, status, score, recommendation)
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, check_key) DO UPDATE SET status=EXCLUDED.status, score=EXCLUDED.score, recommendation=EXCLUDED.recommendation, updated_at=NOW();

INSERT INTO supabase_optimization_checks (store_id, check_key, check_name, status, score, recommendation, metadata)
SELECT s.id, v.check_key, v.check_name, v.status, v.score, v.recommendation, jsonb_build_object('source','PL19 seed')
FROM stores s
CROSS JOIN (VALUES
  ('high_volume_indexes','Supabase high volume indexes','pass',100,'Mantener índices para órdenes, eventos, admin, CRM, channels y performance.'),
  ('slow_query_monitoring','Slow query monitoring','pass',100,'Registrar query profiles y slow query reports periódicamente.'),
  ('connection_usage','Connection usage readiness','warning',70,'Monitorear conexiones durante campañas y automatizaciones.')
) AS v(check_key, check_name, status, score, recommendation)
WHERE s.slug = 'selfcare-sinners'
ON CONFLICT (store_id, check_key) DO UPDATE SET status=EXCLUDED.status, score=EXCLUDED.score, recommendation=EXCLUDED.recommendation, updated_at=NOW();

NOTIFY pgrst, 'reload schema';
