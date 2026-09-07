-- POST-LAUNCH 33 + 34 + 35 — MACROFASE FINAL B
-- Internationalization, Multi-Currency, Tax/Legal Readiness
-- Advanced Personalization, Recommendation Engine & Customer Data Platform
-- Scale Governance Freeze, Maintenance Mode & Product v2 Roadmap

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS internationalization_locales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  locale_key TEXT NOT NULL,
  locale_name TEXT NOT NULL DEFAULT 'Spanish Mexico',
  language_code TEXT NOT NULL DEFAULT 'es',
  region_code TEXT NOT NULL DEFAULT 'MX',
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  readiness_score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, locale_key)
);

CREATE TABLE IF NOT EXISTS multi_currency_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  currency_key TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'MXN',
  currency_name TEXT DEFAULT 'Mexican Peso',
  exchange_rate NUMERIC(12,6) DEFAULT 1,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  pricing_strategy TEXT DEFAULT 'base_currency',
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, currency_key)
);

CREATE TABLE IF NOT EXISTS tax_legal_readiness_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT 'tax_legal',
  jurisdiction TEXT DEFAULT 'MX',
  status TEXT DEFAULT 'pending',
  readiness_score INTEGER DEFAULT 0,
  risk_level TEXT DEFAULT 'medium',
  finding TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS localized_content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  content_key TEXT NOT NULL,
  locale_key TEXT NOT NULL DEFAULT 'es-MX',
  content_type TEXT DEFAULT 'page_copy',
  source_text TEXT,
  localized_text TEXT,
  status TEXT DEFAULT 'draft',
  quality_score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, content_key, locale_key)
);

CREATE TABLE IF NOT EXISTS personalization_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  profile_key TEXT NOT NULL,
  segment_key TEXT DEFAULT 'baseline',
  lifecycle_stage TEXT DEFAULT 'new_customer',
  preference_model JSONB DEFAULT '{}'::jsonb,
  confidence_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, profile_key)
);

CREATE TABLE IF NOT EXISTS recommendation_engine_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  rule_key TEXT NOT NULL,
  rule_name TEXT DEFAULT 'Baseline recommendation rule',
  rule_type TEXT DEFAULT 'product_recommendation',
  target_segment TEXT DEFAULT 'all_customers',
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  lift_score INTEGER DEFAULT 0,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, rule_key)
);

CREATE TABLE IF NOT EXISTS recommendation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  rule_key TEXT,
  customer_key TEXT,
  product_sku TEXT,
  event_type TEXT DEFAULT 'recommendation_served',
  outcome TEXT DEFAULT 'observed',
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, event_key)
);

CREATE TABLE IF NOT EXISTS customer_data_platform_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  cdp_profile_key TEXT NOT NULL,
  email TEXT,
  identity_status TEXT DEFAULT 'anonymous_or_known',
  total_orders INTEGER DEFAULT 0,
  lifetime_value_cents INTEGER DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  attributes JSONB DEFAULT '{}'::jsonb,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, cdp_profile_key)
);

CREATE TABLE IF NOT EXISTS cdp_segment_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  membership_key TEXT NOT NULL,
  cdp_profile_key TEXT,
  segment_key TEXT DEFAULT 'baseline_segment',
  segment_name TEXT DEFAULT 'Baseline Segment',
  status TEXT DEFAULT 'active',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, membership_key)
);

CREATE TABLE IF NOT EXISTS scale_governance_freeze_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  freeze_key TEXT NOT NULL,
  freeze_name TEXT DEFAULT 'Scale governance freeze',
  freeze_scope TEXT DEFAULT 'post_launch_platform',
  status TEXT DEFAULT 'active',
  readiness_score INTEGER DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, freeze_key)
);

CREATE TABLE IF NOT EXISTS maintenance_mode_controls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  control_key TEXT NOT NULL,
  control_name TEXT DEFAULT 'Maintenance mode control',
  is_enabled BOOLEAN DEFAULT FALSE,
  mode_type TEXT DEFAULT 'soft_maintenance',
  status TEXT DEFAULT 'ready',
  message TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, control_key)
);

CREATE TABLE IF NOT EXISTS product_v2_roadmap_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  roadmap_key TEXT NOT NULL,
  roadmap_area TEXT DEFAULT 'product_v2',
  title TEXT NOT NULL DEFAULT 'Product v2 roadmap item',
  description TEXT,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned',
  target_quarter TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, roadmap_key)
);

CREATE INDEX IF NOT EXISTS idx_i18n_locales_store ON internationalization_locales(store_id);
CREATE INDEX IF NOT EXISTS idx_multi_currency_store ON multi_currency_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_tax_legal_store ON tax_legal_readiness_checks(store_id);
CREATE INDEX IF NOT EXISTS idx_localized_content_store ON localized_content_items(store_id);
CREATE INDEX IF NOT EXISTS idx_personalization_profiles_store ON personalization_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_rules_store ON recommendation_engine_rules(store_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_events_store ON recommendation_events(store_id);
CREATE INDEX IF NOT EXISTS idx_cdp_profiles_store ON customer_data_platform_profiles(store_id);
CREATE INDEX IF NOT EXISTS idx_cdp_memberships_store ON cdp_segment_memberships(store_id);
CREATE INDEX IF NOT EXISTS idx_scale_freeze_store ON scale_governance_freeze_records(store_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_controls_store ON maintenance_mode_controls(store_id);
CREATE INDEX IF NOT EXISTS idx_product_v2_roadmap_store ON product_v2_roadmap_items(store_id);

NOTIFY pgrst, 'reload schema';
