-- POST-LAUNCH 23 — Visual Brand System, Design System & Content Finalization
-- Objective: close final brand identity, consolidate design system, normalize components,
-- finish commercial content, improve visual consistency, standardize banners/cards/buttons/forms,
-- close tone/microcopy, prepare definitive campaign assets and leave the store ready as a serious brand.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS visual_brand_systems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  brand_key TEXT NOT NULL,
  area TEXT DEFAULT 'brand_identity',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  title TEXT,
  description TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, brand_key)
);

CREATE TABLE IF NOT EXISTS design_system_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  token_key TEXT NOT NULL,
  token_type TEXT DEFAULT 'generic',
  token_value TEXT,
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  usage_guidance TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, token_key)
);

CREATE TABLE IF NOT EXISTS reusable_component_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  component_key TEXT NOT NULL,
  component_type TEXT DEFAULT 'component',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  standard TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, component_key)
);

CREATE TABLE IF NOT EXISTS commercial_content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  content_key TEXT NOT NULL,
  content_type TEXT DEFAULT 'general',
  surface TEXT DEFAULT 'storefront',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  title TEXT,
  copy TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, content_key)
);

CREATE TABLE IF NOT EXISTS visual_consistency_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  check_key TEXT NOT NULL,
  surface TEXT DEFAULT 'storefront',
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  finding TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS campaign_asset_readiness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  asset_key TEXT NOT NULL,
  campaign_channel TEXT DEFAULT 'general',
  asset_type TEXT DEFAULT 'asset',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  requirement TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, asset_key)
);

CREATE TABLE IF NOT EXISTS brand_microcopy_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  microcopy_key TEXT NOT NULL,
  surface TEXT DEFAULT 'storefront',
  tone TEXT DEFAULT 'clear',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  copy TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, microcopy_key)
);

CREATE TABLE IF NOT EXISTS banner_card_button_form_standards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  standard_key TEXT NOT NULL,
  element_type TEXT DEFAULT 'component',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  standard TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, standard_key)
);

CREATE TABLE IF NOT EXISTS product_content_completion_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  item_key TEXT NOT NULL,
  content_area TEXT DEFAULT 'product',
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  requirement TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, item_key)
);

CREATE TABLE IF NOT EXISTS brand_readiness_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  report_key TEXT NOT NULL,
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  executive_summary TEXT,
  decision TEXT,
  risks JSONB DEFAULT '[]'::jsonb,
  next_actions JSONB DEFAULT '[]'::jsonb,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, report_key)
);

CREATE INDEX IF NOT EXISTS idx_visual_brand_systems_store_status ON visual_brand_systems(store_id, status);
CREATE INDEX IF NOT EXISTS idx_design_system_tokens_store_type ON design_system_tokens(store_id, token_type);
CREATE INDEX IF NOT EXISTS idx_reusable_component_standards_store_type ON reusable_component_standards(store_id, component_type);
CREATE INDEX IF NOT EXISTS idx_commercial_content_items_store_surface ON commercial_content_items(store_id, surface);
CREATE INDEX IF NOT EXISTS idx_visual_consistency_checks_store_status ON visual_consistency_checks(store_id, status);
CREATE INDEX IF NOT EXISTS idx_campaign_asset_readiness_store_channel ON campaign_asset_readiness(store_id, campaign_channel);
CREATE INDEX IF NOT EXISTS idx_brand_microcopy_items_store_surface ON brand_microcopy_items(store_id, surface);
CREATE INDEX IF NOT EXISTS idx_banner_card_button_form_standards_store_element ON banner_card_button_form_standards(store_id, element_type);
CREATE INDEX IF NOT EXISTS idx_product_content_completion_items_store_status ON product_content_completion_items(store_id, status);
CREATE INDEX IF NOT EXISTS idx_brand_readiness_reports_store_status ON brand_readiness_reports(store_id, status);

NOTIFY pgrst, 'reload schema';
