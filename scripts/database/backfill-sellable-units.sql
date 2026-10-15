-- CCP-12 Phase 1. Run only on an explicitly approved, isolated local database.
-- Snapshot legacy input before compatibility triggers change products.stock.
-- No UPDATE of canonical units: retries never reset stock or silently remap SKU.
BEGIN;
LOCK TABLE public.products, public.sellable_units IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE ccp12_products ON COMMIT DROP AS SELECT * FROM public.products;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ccp12_products WHERE variants IS NOT NULL AND jsonb_typeof(variants) <> 'array') THEN
    RAISE EXCEPTION 'BACKFILL_INVALID_VARIANTS_CONTAINER';
  END IF;
END $$;

-- Match CCP-39 ASCII identifiers and NFKD accent removal. Unsupported Unicode
-- case expansions are rejected for manual reconciliation rather than remapped.
CREATE OR REPLACE FUNCTION pg_temp.ccp12_sanitize(value text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE result text;
BEGIN
  IF value IS NULL OR value ~ '[ßﬀﬁﬂﬃﬄﬅﬆ]' THEN RAISE EXCEPTION 'BACKFILL_SKU_SOURCE_REQUIRES_REVIEW'; END IF;
  result := regexp_replace(upper(normalize(value, NFKD)), '[^A-Z0-9_-]', '', 'g');
  IF result = '' THEN RAISE EXCEPTION 'BACKFILL_UNUSABLE_SKU_SOURCE'; END IF;
  RETURN result;
END $$;
CREATE OR REPLACE FUNCTION pg_temp.ccp12_default_sku(sku text, slug text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE result text;
BEGIN
  IF sku ~ '^[A-Za-z0-9_-]+$' THEN RETURN upper(sku); END IF;
  result := regexp_replace(pg_temp.ccp12_sanitize(slug), '[-_]', '', 'g');
  IF result = '' THEN RAISE EXCEPTION 'BACKFILL_UNUSABLE_PRODUCT_SLUG'; END IF;
  RETURN 'SKU-' || result;
END $$;
CREATE TEMP TABLE ccp12_expected (
  product_id uuid NOT NULL, source_key text NOT NULL, sku text NOT NULL,
  title text NOT NULL, barcode text, price_override numeric(10,2), cost_price numeric(10,2),
  stock integer NOT NULL CHECK (stock >= 0), status text NOT NULL, attributes jsonb NOT NULL,
  PRIMARY KEY(product_id, source_key)
) ON COMMIT DROP;

-- Phase 1A: exactly one default unit for each standalone catalog record.
INSERT INTO ccp12_expected
SELECT p.id, 'default', pg_temp.ccp12_default_sku(p.sku, p.slug), p.name,
  NULL, NULL, p.cost, p.stock,
  CASE WHEN p.status = 'active' THEN 'active' ELSE 'archived' END, '{}'::jsonb
FROM ccp12_products p WHERE p.variants IS NULL OR p.variants = '[]'::jsonb;

-- Phase 1B: actual repository variants use name, with optional title/sku/stock/
-- price/barcode/costPrice/cost_price/attributes. Require explicit valid stock.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM ccp12_products p CROSS JOIN LATERAL jsonb_array_elements(p.variants) v
    WHERE jsonb_typeof(v) <> 'object'
      OR jsonb_typeof(v->'stock') IS DISTINCT FROM 'number'
      OR COALESCE(v->>'stock', '') !~ '^[0-9]+$'
      OR COALESCE(NULLIF(btrim(v->>'title'), ''), NULLIF(btrim(v->>'name'), '')) IS NULL
      OR (v->'attributes' IS NOT NULL AND v->'attributes' <> 'null'::jsonb AND jsonb_typeof(v->'attributes') <> 'object')
  ) THEN RAISE EXCEPTION 'BACKFILL_INVALID_VARIANT'; END IF;
END $$;
INSERT INTO ccp12_expected
SELECT p.id, 'variant:' || ordinality,
  CASE WHEN v->>'sku' ~ '^[A-Za-z0-9_-]+$' THEN upper(v->>'sku')
    ELSE pg_temp.ccp12_default_sku(p.sku, p.slug) || '-' || pg_temp.ccp12_sanitize(label) END,
  p.name || ' (' || label || ')',
  CASE WHEN jsonb_typeof(v->'barcode') = 'string' AND btrim(v->>'barcode') <> ''
    AND v->>'barcode' !~ '[[:cntrl:]]' THEN normalize(btrim(v->>'barcode'), NFC) END,
  (v->>'price')::numeric, COALESCE(v->>'costPrice', v->>'cost_price')::numeric,
  (v->>'stock')::integer,
  CASE WHEN p.status = 'active' THEN 'active' ELSE 'archived' END,
  COALESCE(NULLIF(v->'attributes', 'null'::jsonb), '{}'::jsonb)
FROM ccp12_products p CROSS JOIN LATERAL jsonb_array_elements(p.variants) WITH ORDINALITY variant(v, ordinality)
CROSS JOIN LATERAL (SELECT COALESCE(NULLIF(btrim(v->>'title'), ''), btrim(v->>'name')) label) labels;

-- Keep original parent totals separately from the live compatibility field.
-- A repeat of an already mapped archived variant product has advisory zero;
-- this is explained only when every canonical unit still matches its source.
CREATE TEMP TABLE ccp12_parent_reconciliation ON COMMIT DROP AS
SELECT p.id product_id, p.stock legacy_parent_stock, sum(e.stock)::bigint variant_stock_total,
  p.status IS DISTINCT FROM 'active' AND p.stock = 0 AND NOT EXISTS (
    SELECT 1 FROM ccp12_expected expected LEFT JOIN public.sellable_units existing
      ON existing.product_id = expected.product_id AND existing.sku = expected.sku
    WHERE expected.product_id = p.id AND (existing.id IS NULL
      OR existing.stock <> expected.stock OR existing.status <> expected.status)
  ) AS compatibility_zero_explained
FROM ccp12_products p JOIN ccp12_expected e ON e.product_id = p.id
WHERE e.source_key LIKE 'variant:%'
GROUP BY p.id, p.stock, p.status;
SELECT product_id, legacy_parent_stock, variant_stock_total,
  legacy_parent_stock - variant_stock_total AS discrepancy
FROM ccp12_parent_reconciliation
WHERE legacy_parent_stock <> variant_stock_total AND NOT compatibility_zero_explained
ORDER BY product_id;
DO $$
DECLARE mismatch record;
BEGIN
  SELECT * INTO mismatch FROM ccp12_parent_reconciliation
  WHERE legacy_parent_stock <> variant_stock_total AND NOT compatibility_zero_explained
  ORDER BY product_id LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'BACKFILL_LEGACY_PARENT_STOCK_MISMATCH',
      DETAIL = format('product_id=%s, legacy_parent_stock=%s, variant_stock_total=%s, discrepancy=%s',
        mismatch.product_id, mismatch.legacy_parent_stock, mismatch.variant_stock_total,
        mismatch.legacy_parent_stock - mismatch.variant_stock_total);
  END IF;
END $$;

-- Preflight is deliberately stricter than ON CONFLICT DO NOTHING.
-- Store-scoped legacy SKUs may collide globally. Reject the whole backfill.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ccp12_expected GROUP BY sku HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'BACKFILL_DUPLICATE_CANONICAL_SKU';
  END IF;
  IF EXISTS (SELECT 1 FROM ccp12_expected WHERE price_override < 0 OR cost_price < 0
    OR btrim(title) = '' OR EXISTS (SELECT 1 FROM jsonb_each(attributes) a
      WHERE jsonb_typeof(a.value) <> 'string' OR btrim(a.key) = ''
        OR a.key IN ('__proto__', 'constructor', 'prototype')
        OR a.key ~ '[[:cntrl:]]' OR a.value #>> '{}' ~ '[[:cntrl:]]')) THEN
    RAISE EXCEPTION 'BACKFILL_INVALID_UNIT_DATA';
  END IF;
  IF EXISTS (SELECT 1 FROM ccp12_expected e JOIN public.sellable_units s USING(sku)
    WHERE s.product_id <> e.product_id OR s.title <> e.title OR s.attributes <> e.attributes
      OR s.status <> e.status OR s.barcode IS DISTINCT FROM e.barcode
      OR s.price_override IS DISTINCT FROM e.price_override OR s.cost_price IS DISTINCT FROM e.cost_price) THEN
    RAISE EXCEPTION 'BACKFILL_EXISTING_MAPPING_MISMATCH';
  END IF;
  IF EXISTS (SELECT 1 FROM public.sellable_units s LEFT JOIN ccp12_expected e
    ON s.product_id = e.product_id AND s.sku = e.sku WHERE e.sku IS NULL) THEN
    RAISE EXCEPTION 'BACKFILL_UNEXPLAINED_CANONICAL_UNIT';
  END IF;
  IF EXISTS (SELECT 1 FROM ccp12_expected e JOIN public.sellable_units s USING(sku)
    WHERE s.stock <> e.stock AND (e.source_key <> 'default' OR e.status = 'active')) THEN
    RAISE EXCEPTION 'BACKFILL_EXISTING_STOCK_MISMATCH';
  END IF;
END $$;
INSERT INTO public.sellable_units(product_id, sku, title, barcode, price_override, cost_price, stock, status, attributes)
SELECT product_id, sku, title, barcode, price_override, cost_price, stock, status, attributes
FROM ccp12_expected e WHERE NOT EXISTS (SELECT 1 FROM public.sellable_units s WHERE s.sku = e.sku)
ORDER BY product_id, sku;

-- Deterministic reconciliation. Every defect query must return zero rows.
SELECT (SELECT count(*) FROM ccp12_expected) expected_units,
       (SELECT count(*) FROM public.sellable_units) actual_units;
SELECT sku, count(*) FROM public.sellable_units GROUP BY sku HAVING count(*) > 1;
SELECT e.product_id, e.source_key, e.sku FROM ccp12_expected e
LEFT JOIN public.sellable_units s ON s.sku = e.sku AND s.product_id = e.product_id WHERE s.id IS NULL;
SELECT s.id, s.product_id, s.sku FROM public.sellable_units s LEFT JOIN ccp12_expected e
ON e.sku = s.sku AND e.product_id = s.product_id WHERE e.sku IS NULL;
SELECT e.product_id, e.source_key, e.stock legacy_stock, s.stock canonical_stock
FROM ccp12_expected e JOIN public.sellable_units s USING(sku)
WHERE e.stock <> s.stock AND (e.source_key <> 'default' OR e.status = 'active');
-- Compare original parent values with canonical totals after synchronization,
-- never with the live products.stock value overwritten by the trigger.
SELECT original.product_id, original.legacy_parent_stock, sum(s.stock) canonical_stock,
  original.legacy_parent_stock - sum(s.stock) discrepancy
FROM ccp12_parent_reconciliation original JOIN public.sellable_units s USING(product_id)
WHERE NOT original.compatibility_zero_explained
GROUP BY original.product_id, original.legacy_parent_stock
HAVING original.legacy_parent_stock <> sum(s.stock);
-- Archived standalone parent stock becomes zero by contract; on a retry its
-- advisory zero is not a seed. Preserve existing canonical stock unchanged.
SELECT e.product_id, e.stock archived_advisory_stock, s.stock preserved_canonical_stock
FROM ccp12_expected e JOIN public.sellable_units s USING(sku)
WHERE e.source_key = 'default' AND e.status = 'archived' AND e.stock <> s.stock;
SELECT p.id, p.stock advisory_stock, COALESCE(sum(s.stock) FILTER (WHERE s.status = 'active'), 0) active_unit_stock
FROM public.products p LEFT JOIN public.sellable_units s ON s.product_id = p.id
GROUP BY p.id, p.stock HAVING p.stock <> COALESCE(sum(s.stock) FILTER (WHERE s.status = 'active'), 0);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM ccp12_parent_reconciliation original
      WHERE NOT original.compatibility_zero_explained AND original.legacy_parent_stock <> (
        SELECT COALESCE(sum(s.stock), 0) FROM public.sellable_units s WHERE s.product_id = original.product_id))
    OR (SELECT count(*) FROM ccp12_expected) <> (SELECT count(*) FROM public.sellable_units)
    OR EXISTS (SELECT 1 FROM ccp12_expected e LEFT JOIN public.sellable_units s
      ON e.sku = s.sku AND e.product_id = s.product_id WHERE s.id IS NULL)
    OR EXISTS (SELECT 1 FROM public.products p WHERE p.stock <> (
      SELECT COALESCE(sum(s.stock), 0) FROM public.sellable_units s WHERE s.product_id = p.id AND s.status = 'active')) THEN
    RAISE EXCEPTION 'BACKFILL_RECONCILIATION_FAILED';
  END IF;
END $$;
COMMIT;
