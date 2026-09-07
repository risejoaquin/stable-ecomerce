-- Selfcare Sinners - SUPERFASE E
-- SEO, performance, accessibility and production polish support.

CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS long_description TEXT,
  ADD COLUMN IF NOT EXISTS ingredients JSONB DEFAULT '[]'::jsonb;

UPDATE products
SET slug = lower(regexp_replace(regexp_replace(unaccent(coalesce(name, id::text)), '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
WHERE slug IS NULL OR slug = '';

CREATE INDEX IF NOT EXISTS idx_products_store_status_updated_at
ON products(store_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_products_store_status_slug
ON products(store_id, status, slug);

CREATE INDEX IF NOT EXISTS idx_products_search_name_description
ON products USING gin (
  to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(seo_title, '') || ' ' || coalesce(seo_description, ''))
);

COMMENT ON COLUMN products.slug IS 'Public product slug used for canonical product URLs and sitemap entries.';
COMMENT ON COLUMN products.seo_title IS 'Product-specific SEO title shown in meta and Open Graph tags.';
COMMENT ON COLUMN products.seo_description IS 'Product-specific SEO description shown in meta and Open Graph tags.';
COMMENT ON COLUMN products.long_description IS 'Long-form public product description for richer storefront content.';
COMMENT ON COLUMN products.ingredients IS 'Structured product ingredient/use details for the product detail page.';

NOTIFY pgrst, 'reload schema';
