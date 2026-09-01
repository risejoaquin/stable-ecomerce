-- POST-LAUNCH 24 HOTFIX 24.1
-- Campaign landing pages schema-cache compatibility
-- Cause: campaign_landing_pages already existed from an earlier phase, so CREATE TABLE IF NOT EXISTS
-- did not add the PL24 columns required by /api/admin/content-seo/landing-pages/run.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE campaign_landing_pages
  ADD COLUMN IF NOT EXISTS landing_key TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS score NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS value_proposition TEXT,
  ADD COLUMN IF NOT EXISTS primary_cta TEXT,
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS executed_by UUID,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE campaign_landing_pages
SET
  landing_key = COALESCE(NULLIF(BTRIM(landing_key), ''), slug, 'landing-' || SUBSTRING(id::text, 1, 8)),
  slug = COALESCE(NULLIF(BTRIM(slug), ''), 'landing-' || SUBSTRING(id::text, 1, 8)),
  campaign_type = COALESCE(NULLIF(BTRIM(campaign_type), ''), 'general'),
  status = COALESCE(NULLIF(BTRIM(status), ''), 'draft'),
  score = COALESCE(score, 0),
  metadata = COALESCE(metadata, '{}'::jsonb),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  executed_at = COALESCE(executed_at, NOW())
WHERE landing_key IS NULL
   OR slug IS NULL
   OR campaign_type IS NULL
   OR status IS NULL
   OR score IS NULL
   OR metadata IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL
   OR executed_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_campaign_landing_pages_store_landing_key
  ON campaign_landing_pages(store_id, landing_key);
CREATE INDEX IF NOT EXISTS idx_campaign_landing_pages_status
  ON campaign_landing_pages(status);
CREATE INDEX IF NOT EXISTS idx_campaign_landing_pages_campaign_type
  ON campaign_landing_pages(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_landing_pages_updated_at
  ON campaign_landing_pages(updated_at DESC);

NOTIFY pgrst, 'reload schema';
