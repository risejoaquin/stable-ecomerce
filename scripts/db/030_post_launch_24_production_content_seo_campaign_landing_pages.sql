-- POST-LAUNCH 24 — Production Content Completion, SEO Content Depth & Campaign Landing Pages
-- Objective: complete production content, create commercial landing pages, reinforce SEO depth,
-- optimize pages by search intent, prepare campaign pages, close product/category copy,
-- improve educational content and prepare organic + paid traffic.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS production_content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  content_key TEXT NOT NULL,
  content_type TEXT DEFAULT 'general',
  surface TEXT DEFAULT 'storefront',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  title TEXT,
  body TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, content_key)
);

CREATE TABLE IF NOT EXISTS campaign_landing_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  landing_key TEXT NOT NULL,
  slug TEXT,
  campaign_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  headline TEXT,
  value_proposition TEXT,
  primary_cta TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, landing_key)
);

CREATE TABLE IF NOT EXISTS seo_content_depth_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  check_key TEXT NOT NULL,
  page_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  target_keyword TEXT,
  content_gap TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS search_intent_optimization_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  intent_key TEXT NOT NULL,
  intent_type TEXT DEFAULT 'commercial',
  status TEXT DEFAULT 'planned',
  score NUMERIC(6,2) DEFAULT 0,
  target_query TEXT,
  optimized_surface TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, intent_key)
);

CREATE TABLE IF NOT EXISTS campaign_page_readiness (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  readiness_key TEXT NOT NULL,
  channel TEXT DEFAULT 'campaign',
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  requirement TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, readiness_key)
);

CREATE TABLE IF NOT EXISTS product_category_copy_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  copy_key TEXT NOT NULL,
  entity_type TEXT DEFAULT 'product',
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  title TEXT,
  copy TEXT,
  seo_notes TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, copy_key)
);

CREATE TABLE IF NOT EXISTS educational_content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  education_key TEXT NOT NULL,
  topic TEXT,
  status TEXT DEFAULT 'draft',
  score NUMERIC(6,2) DEFAULT 0,
  audience TEXT DEFAULT 'customer',
  content_goal TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, education_key)
);

CREATE TABLE IF NOT EXISTS organic_traffic_readiness_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  check_key TEXT NOT NULL,
  area TEXT DEFAULT 'organic',
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  requirement TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS paid_traffic_landing_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID,
  check_key TEXT NOT NULL,
  channel TEXT DEFAULT 'paid',
  status TEXT DEFAULT 'pending',
  score NUMERIC(6,2) DEFAULT 0,
  requirement TEXT,
  recommendation TEXT,
  executed_by UUID,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(store_id, check_key)
);

CREATE TABLE IF NOT EXISTS content_readiness_reports (
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

CREATE INDEX IF NOT EXISTS idx_production_content_items_status ON production_content_items(status);
CREATE INDEX IF NOT EXISTS idx_campaign_landing_pages_status ON campaign_landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_seo_content_depth_checks_status ON seo_content_depth_checks(status);
CREATE INDEX IF NOT EXISTS idx_search_intent_optimization_items_status ON search_intent_optimization_items(status);
CREATE INDEX IF NOT EXISTS idx_campaign_page_readiness_status ON campaign_page_readiness(status);
CREATE INDEX IF NOT EXISTS idx_product_category_copy_items_status ON product_category_copy_items(status);
CREATE INDEX IF NOT EXISTS idx_educational_content_items_status ON educational_content_items(status);
CREATE INDEX IF NOT EXISTS idx_organic_traffic_readiness_checks_status ON organic_traffic_readiness_checks(status);
CREATE INDEX IF NOT EXISTS idx_paid_traffic_landing_checks_status ON paid_traffic_landing_checks(status);
CREATE INDEX IF NOT EXISTS idx_content_readiness_reports_status ON content_readiness_reports(status);

NOTIFY pgrst, 'reload schema';
