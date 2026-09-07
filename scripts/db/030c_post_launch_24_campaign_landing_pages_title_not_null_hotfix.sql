-- POST-LAUNCH 24 HOTFIX 24.2
-- Campaign landing pages title NOT NULL compatibility
-- Cause: campaign_landing_pages already existed from PL06 with title TEXT NOT NULL.
-- PL24 inserts use headline/value_proposition, so older schema rejects rows without title.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE campaign_landing_pages
  ADD COLUMN IF NOT EXISTS landing_key TEXT,
  ADD COLUMN IF NOT EXISTS campaign_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS score NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS value_proposition TEXT,
  ADD COLUMN IF NOT EXISTS recommendation TEXT,
  ADD COLUMN IF NOT EXISTS executed_by UUID,
  ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE campaign_landing_pages
  ALTER COLUMN title SET DEFAULT 'Campaign landing page';

UPDATE campaign_landing_pages
SET
  landing_key = COALESCE(NULLIF(BTRIM(landing_key), ''), NULLIF(BTRIM(slug), ''), 'landing-' || SUBSTRING(id::text, 1, 8)),
  slug = COALESCE(NULLIF(BTRIM(slug), ''), NULLIF(BTRIM(landing_key), ''), 'landing-' || SUBSTRING(id::text, 1, 8)),
  campaign_type = COALESCE(NULLIF(BTRIM(campaign_type), ''), 'general'),
  status = COALESCE(NULLIF(BTRIM(status), ''), 'draft'),
  score = COALESCE(score, 0),
  headline = COALESCE(NULLIF(BTRIM(headline), ''), NULLIF(BTRIM(title), ''), 'Campaign landing page'),
  title = COALESCE(NULLIF(BTRIM(title), ''), NULLIF(BTRIM(headline), ''), 'Campaign landing page'),
  subtitle = COALESCE(NULLIF(BTRIM(subtitle), ''), NULLIF(BTRIM(value_proposition), ''), 'Landing page preparada para campañas.'),
  primary_cta = COALESCE(NULLIF(BTRIM(primary_cta), ''), 'Comprar ahora'),
  content = COALESCE(content, '{}'::jsonb),
  metadata = COALESCE(metadata, '{}'::jsonb),
  updated_at = COALESCE(updated_at, NOW()),
  executed_at = COALESCE(executed_at, NOW())
WHERE landing_key IS NULL
   OR slug IS NULL
   OR campaign_type IS NULL
   OR status IS NULL
   OR score IS NULL
   OR headline IS NULL
   OR title IS NULL
   OR subtitle IS NULL
   OR primary_cta IS NULL
   OR content IS NULL
   OR metadata IS NULL
   OR updated_at IS NULL
   OR executed_at IS NULL;

CREATE OR REPLACE FUNCTION normalize_campaign_landing_pages_pl24()
RETURNS TRIGGER AS $$
BEGIN
  NEW.landing_key := COALESCE(NULLIF(BTRIM(NEW.landing_key), ''), NULLIF(BTRIM(NEW.slug), ''), 'landing-' || SUBSTRING(COALESCE(NEW.id, uuid_generate_v4())::text, 1, 8));
  NEW.slug := COALESCE(NULLIF(BTRIM(NEW.slug), ''), NEW.landing_key, 'landing-' || SUBSTRING(COALESCE(NEW.id, uuid_generate_v4())::text, 1, 8));
  NEW.campaign_type := COALESCE(NULLIF(BTRIM(NEW.campaign_type), ''), 'general');
  NEW.status := COALESCE(NULLIF(BTRIM(NEW.status), ''), 'draft');
  NEW.score := COALESCE(NEW.score, 0);
  NEW.headline := COALESCE(NULLIF(BTRIM(NEW.headline), ''), NULLIF(BTRIM(NEW.title), ''), 'Campaign landing page');
  NEW.title := COALESCE(NULLIF(BTRIM(NEW.title), ''), NEW.headline, 'Campaign landing page');
  NEW.subtitle := COALESCE(NULLIF(BTRIM(NEW.subtitle), ''), NULLIF(BTRIM(NEW.value_proposition), ''), 'Landing page preparada para campañas.');
  NEW.primary_cta := COALESCE(NULLIF(BTRIM(NEW.primary_cta), ''), 'Comprar ahora');
  NEW.content := COALESCE(NEW.content, '{}'::jsonb);
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
  NEW.created_at := COALESCE(NEW.created_at, NOW());
  NEW.updated_at := NOW();
  NEW.executed_at := COALESCE(NEW.executed_at, NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_campaign_landing_pages_pl24 ON campaign_landing_pages;
CREATE TRIGGER trg_normalize_campaign_landing_pages_pl24
BEFORE INSERT OR UPDATE ON campaign_landing_pages
FOR EACH ROW EXECUTE FUNCTION normalize_campaign_landing_pages_pl24();

CREATE UNIQUE INDEX IF NOT EXISTS ux_campaign_landing_pages_store_landing_key
  ON campaign_landing_pages(store_id, landing_key);

NOTIFY pgrst, 'reload schema';
