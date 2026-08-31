-- ============================================================
-- POST-LAUNCH 15 — AI Commerce Assistant, Smart Search & Product Discovery
-- Selfcare Sinners Ecommerce
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Smart search query/event log
CREATE TABLE IF NOT EXISTS ai_search_queries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_email TEXT,
  session_id TEXT,
  query TEXT NOT NULL,
  normalized_query TEXT,
  intent TEXT DEFAULT 'unknown',
  intent_score NUMERIC(10,4) DEFAULT 0,
  result_count INTEGER DEFAULT 0,
  clicked_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  converted BOOLEAN DEFAULT FALSE,
  source TEXT DEFAULT 'web',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assistant sessions/messages
CREATE TABLE IF NOT EXISTS ai_assistant_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_email TEXT,
  session_id TEXT,
  status TEXT DEFAULT 'active',
  channel TEXT DEFAULT 'web',
  intent TEXT DEFAULT 'shopping_assistance',
  conversion_score NUMERIC(10,4) DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_assistant_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES ai_assistant_sessions(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT 'user',
  message TEXT NOT NULL,
  response TEXT,
  detected_intent TEXT DEFAULT 'unknown',
  intent_score NUMERIC(10,4) DEFAULT 0,
  recommended_product_ids UUID[] DEFAULT ARRAY[]::UUID[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discovery, FAQ, synonyms and intent scoring
CREATE TABLE IF NOT EXISTS ai_product_discovery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_email TEXT,
  query TEXT,
  discovery_type TEXT DEFAULT 'guided',
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  score NUMERIC(10,4) DEFAULT 0,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_faq_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  topic TEXT DEFAULT 'general',
  keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_faq_interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  faq_entry_id UUID REFERENCES ai_faq_entries(id) ON DELETE SET NULL,
  query TEXT,
  matched BOOLEAN DEFAULT FALSE,
  helpful BOOLEAN,
  source TEXT DEFAULT 'web',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skincare_synonyms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  term TEXT NOT NULL,
  synonyms TEXT[] DEFAULT ARRAY[]::TEXT[],
  category TEXT DEFAULT 'skincare',
  language TEXT DEFAULT 'es',
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, term, language)
);

CREATE TABLE IF NOT EXISTS ai_intent_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'unknown',
  score NUMERIC(10,4) DEFAULT 0,
  signals JSONB DEFAULT '{}'::jsonb,
  source TEXT DEFAULT 'api',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_recommendation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  rule_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_terms TEXT[] DEFAULT ARRAY[]::TEXT[],
  target_product_ids UUID[] DEFAULT ARRAY[]::UUID[],
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, rule_key)
);

CREATE TABLE IF NOT EXISTS ai_recommendation_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_email TEXT,
  query TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  recommendation_type TEXT DEFAULT 'smart_search',
  score NUMERIC(10,4) DEFAULT 0,
  clicked BOOLEAN DEFAULT FALSE,
  converted BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_search_insight_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  period TEXT DEFAULT TO_CHAR(NOW(), 'YYYY-MM'),
  total_queries INTEGER DEFAULT 0,
  zero_result_queries INTEGER DEFAULT 0,
  assisted_sessions INTEGER DEFAULT 0,
  conversion_intent_queries INTEGER DEFAULT 0,
  top_queries JSONB DEFAULT '[]'::jsonb,
  top_intents JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, period)
);

-- Backward/forward compatibility columns
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS search_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS ai_summary TEXT,
  ADD COLUMN IF NOT EXISTS discovery_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS recommendation_score NUMERIC(10,4) DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_search_queries_store_created ON ai_search_queries(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_search_queries_normalized ON ai_search_queries(normalized_query);
CREATE INDEX IF NOT EXISTS idx_ai_search_queries_intent ON ai_search_queries(intent);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_sessions_store_created ON ai_assistant_sessions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_sessions_status ON ai_assistant_sessions(status);
CREATE INDEX IF NOT EXISTS idx_ai_assistant_messages_session_created ON ai_assistant_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_product_discovery_events_store_created ON ai_product_discovery_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_faq_entries_store_active ON ai_faq_entries(store_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_ai_faq_interactions_store_created ON ai_faq_interactions(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_skincare_synonyms_store_active ON skincare_synonyms(store_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_intent_scores_store_created ON ai_intent_scores(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_rules_store_active ON ai_recommendation_rules(store_id, is_active, priority DESC);
CREATE INDEX IF NOT EXISTS idx_ai_recommendation_events_store_created ON ai_recommendation_events(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_search_insight_snapshots_store_period ON ai_search_insight_snapshots(store_id, period DESC);

-- Defensive normalizers
CREATE OR REPLACE FUNCTION normalize_ai_commerce_core()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'ai_search_queries' THEN
    NEW.query := COALESCE(NULLIF(BTRIM(NEW.query), ''), 'empty search');
    NEW.normalized_query := COALESCE(NULLIF(BTRIM(NEW.normalized_query), ''), LOWER(NEW.query));
    NEW.intent := COALESCE(NULLIF(BTRIM(NEW.intent), ''), 'unknown');
    NEW.intent_score := COALESCE(NEW.intent_score, 0);
    NEW.result_count := COALESCE(NEW.result_count, 0);
    NEW.source := COALESCE(NULLIF(BTRIM(NEW.source), ''), 'web');
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
  ELSIF TG_TABLE_NAME = 'ai_assistant_sessions' THEN
    NEW.status := COALESCE(NULLIF(BTRIM(NEW.status), ''), 'active');
    NEW.channel := COALESCE(NULLIF(BTRIM(NEW.channel), ''), 'web');
    NEW.intent := COALESCE(NULLIF(BTRIM(NEW.intent), ''), 'shopping_assistance');
    NEW.conversion_score := COALESCE(NEW.conversion_score, 0);
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
    NEW.updated_at := NOW();
  ELSIF TG_TABLE_NAME = 'ai_faq_entries' THEN
    NEW.topic := COALESCE(NULLIF(BTRIM(NEW.topic), ''), 'general');
    NEW.keywords := COALESCE(NEW.keywords, ARRAY[]::TEXT[]);
    NEW.is_active := COALESCE(NEW.is_active, TRUE);
    NEW.sort_order := COALESCE(NEW.sort_order, 0);
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
    NEW.updated_at := NOW();
  ELSIF TG_TABLE_NAME = 'skincare_synonyms' THEN
    NEW.term := COALESCE(NULLIF(BTRIM(NEW.term), ''), 'general');
    NEW.synonyms := COALESCE(NEW.synonyms, ARRAY[]::TEXT[]);
    NEW.category := COALESCE(NULLIF(BTRIM(NEW.category), ''), 'skincare');
    NEW.language := COALESCE(NULLIF(BTRIM(NEW.language), ''), 'es');
    NEW.is_active := COALESCE(NEW.is_active, TRUE);
    NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb);
    NEW.updated_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_ai_search_queries ON ai_search_queries;
CREATE TRIGGER trg_normalize_ai_search_queries BEFORE INSERT OR UPDATE ON ai_search_queries FOR EACH ROW EXECUTE FUNCTION normalize_ai_commerce_core();

DROP TRIGGER IF EXISTS trg_normalize_ai_assistant_sessions ON ai_assistant_sessions;
CREATE TRIGGER trg_normalize_ai_assistant_sessions BEFORE INSERT OR UPDATE ON ai_assistant_sessions FOR EACH ROW EXECUTE FUNCTION normalize_ai_commerce_core();

DROP TRIGGER IF EXISTS trg_normalize_ai_faq_entries ON ai_faq_entries;
CREATE TRIGGER trg_normalize_ai_faq_entries BEFORE INSERT OR UPDATE ON ai_faq_entries FOR EACH ROW EXECUTE FUNCTION normalize_ai_commerce_core();

DROP TRIGGER IF EXISTS trg_normalize_skincare_synonyms ON skincare_synonyms;
CREATE TRIGGER trg_normalize_skincare_synonyms BEFORE INSERT OR UPDATE ON skincare_synonyms FOR EACH ROW EXECUTE FUNCTION normalize_ai_commerce_core();

-- Seeds
WITH primary_store AS (
  SELECT id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1
)
INSERT INTO skincare_synonyms (store_id, term, synonyms, category, language, metadata)
SELECT id, item.term, item.synonyms, item.category, 'es', jsonb_build_object('source', 'PL15 seed')
FROM primary_store
CROSS JOIN (
  VALUES
    ('hidratante', ARRAY['crema','humectante','moisturizer','piel seca']::TEXT[], 'skincare'),
    ('limpiador', ARRAY['cleanser','jabón facial','gel limpiador','limpieza']::TEXT[], 'skincare'),
    ('protector solar', ARRAY['spf','bloqueador','sunscreen','fotoprotector']::TEXT[], 'skincare'),
    ('acné', ARRAY['granitos','imperfecciones','brotes','piel grasa']::TEXT[], 'skincare'),
    ('sensibilidad', ARRAY['piel sensible','irritación','rojeces','barrera cutánea']::TEXT[], 'skincare')
) AS item(term, synonyms, category)
ON CONFLICT (store_id, term, language)
DO UPDATE SET synonyms = EXCLUDED.synonyms, category = EXCLUDED.category, is_active = TRUE, updated_at = NOW();

WITH primary_store AS (
  SELECT id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1
)
INSERT INTO ai_faq_entries (store_id, question, answer, topic, keywords, sort_order, metadata)
SELECT id, item.question, item.answer, item.topic, item.keywords, item.sort_order, jsonb_build_object('source', 'PL15 seed')
FROM primary_store
CROSS JOIN (
  VALUES
    ('¿Cómo elijo un producto para mi tipo de piel?', 'Empieza por identificar si tu piel es seca, grasa, mixta o sensible. Revisa ingredientes, objetivo del producto y compatibilidad con tu rutina actual.', 'skincare', ARRAY['tipo de piel','rutina','recomendación']::TEXT[], 10),
    ('¿Cuándo recibo mi pedido?', 'Puedes revisar el estado desde el seguimiento de pedido. Los tiempos dependen del procesamiento y envío configurado por la tienda.', 'orders', ARRAY['envío','pedido','seguimiento']::TEXT[], 20),
    ('¿Puedo recibir recomendaciones personalizadas?', 'Sí. El asistente puede guiarte con base en intención de compra, necesidad de skincare y productos disponibles.', 'assistant', ARRAY['recomendaciones','asistente','personalización']::TEXT[], 30)
) AS item(question, answer, topic, keywords, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM ai_faq_entries e WHERE e.store_id = primary_store.id AND e.question = item.question
);

WITH primary_store AS (
  SELECT id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1
)
INSERT INTO ai_recommendation_rules (store_id, rule_key, name, description, trigger_terms, priority, metadata)
SELECT id, item.rule_key, item.name, item.description, item.trigger_terms, item.priority, jsonb_build_object('source', 'PL15 seed')
FROM primary_store
CROSS JOIN (
  VALUES
    ('hydration_intent', 'Recomendación por hidratación', 'Detecta intención de hidratación y prioriza productos hidratantes.', ARRAY['hidratante','crema','piel seca']::TEXT[], 100),
    ('acne_intent', 'Recomendación por acné', 'Detecta intención relacionada con imperfecciones o piel grasa.', ARRAY['acné','granitos','piel grasa']::TEXT[], 90),
    ('sensitive_skin_intent', 'Recomendación piel sensible', 'Detecta intención relacionada con sensibilidad o barrera cutánea.', ARRAY['sensible','irritación','rojeces']::TEXT[], 80)
) AS item(rule_key, name, description, trigger_terms, priority)
ON CONFLICT (store_id, rule_key)
DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, trigger_terms = EXCLUDED.trigger_terms, priority = EXCLUDED.priority, is_active = TRUE, updated_at = NOW();

NOTIFY pgrst, 'reload schema';
