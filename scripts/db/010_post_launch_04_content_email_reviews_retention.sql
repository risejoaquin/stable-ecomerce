-- Selfcare Sinners - POST-LAUNCH 04
-- Content, Email, Reviews & Retention

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS support_hours TEXT,
  ADD COLUMN IF NOT EXISTS legal_business_name TEXT,
  ADD COLUMN IF NOT EXISTS legal_address TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_config JSONB DEFAULT '{}'::jsonb;

ALTER TABLE commercial_campaigns
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS objective TEXT,
  ADD COLUMN IF NOT EXISTS audience_segment TEXT,
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS landing_url TEXT,
  ADD COLUMN IF NOT EXISTS email_subject TEXT,
  ADD COLUMN IF NOT EXISTS email_preview TEXT;

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'storefront',
  ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_purchase BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_text TEXT,
  ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  source TEXT DEFAULT 'storefront',
  status TEXT DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed', 'bounced', 'complained')),
  consent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, email)
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  name TEXT,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed', 'spam')),
  source TEXT DEFAULT 'contact_page',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lifecycle_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  lifecycle_stage TEXT DEFAULT 'general',
  channel TEXT DEFAULT 'email',
  status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'queued', 'sent', 'skipped', 'failed', 'completed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  customer_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'reviewed', 'skipped', 'failed')),
  sent_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_id, customer_email)
);

CREATE TABLE IF NOT EXISTS public_content_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  page_type TEXT DEFAULT 'content',
  content TEXT NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(store_id, slug)
);

CREATE TABLE IF NOT EXISTS abandoned_cart_recovery_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  abandoned_cart_id UUID REFERENCES abandoned_carts(id) ON DELETE SET NULL,
  email TEXT,
  event_type TEXT NOT NULL,
  status TEXT DEFAULT 'recorded' CHECK (status IN ('recorded', 'queued', 'sent', 'recovered', 'failed', 'skipped')),
  cart_total DECIMAL(10,2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_store_status
ON newsletter_subscribers(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
ON newsletter_subscribers(email);

CREATE INDEX IF NOT EXISTS idx_support_messages_store_status
ON support_messages(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_store_stage_status
ON lifecycle_events(store_id, lifecycle_stage, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_requests_store_status
ON review_requests(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_content_pages_store_slug_status
ON public_content_pages(store_id, slug, status);

CREATE INDEX IF NOT EXISTS idx_abandoned_cart_recovery_events_store_status
ON abandoned_cart_recovery_events(store_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_events_store_event_status
ON email_events(store_id, event_type, status, created_at DESC);

DO $$
DECLARE
  primary_store_id UUID;
BEGIN
  SELECT id INTO primary_store_id FROM stores WHERE slug = 'selfcare-sinners' LIMIT 1;

  IF primary_store_id IS NOT NULL THEN
    UPDATE stores
    SET
      support_hours = COALESCE(support_hours, 'Lunes a viernes, 10:00 a 18:00.'),
      contact_whatsapp = COALESCE(contact_whatsapp, whatsapp_url),
      lifecycle_config = COALESCE(lifecycle_config, '{}'::jsonb) || jsonb_build_object(
        'review_request_days_after_delivery', 3,
        'reorder_coupon_days_after_purchase', 21,
        'abandoned_cart_hours', 2
      ),
      updated_at = NOW()
    WHERE id = primary_store_id;

    INSERT INTO public_content_pages(store_id, slug, title, page_type, content, seo_title, seo_description)
    VALUES
      (primary_store_id, 'shipping', 'Envíos y seguimiento', 'policy', 'Procesamos pedidos pagados y compartimos seguimiento cuando esté disponible. Los tiempos pueden variar según paquetería y zona de entrega.', 'Envíos y seguimiento | Selfcare Sinners', 'Consulta la política de envíos, preparación y seguimiento de pedidos de Selfcare Sinners.'),
      (primary_store_id, 'returns', 'Cambios y devoluciones', 'policy', 'Aceptamos solicitudes de cambio o devolución conforme al estado del producto, empaque, evidencia y tiempos publicados por la tienda.', 'Cambios y devoluciones | Selfcare Sinners', 'Consulta la política de cambios y devoluciones de Selfcare Sinners.'),
      (primary_store_id, 'privacy', 'Privacidad', 'policy', 'Usamos tus datos para procesar compras, atención al cliente, seguimiento, facturación operativa y comunicaciones autorizadas. No vendemos tus datos.', 'Privacidad | Selfcare Sinners', 'Aviso de privacidad operativo de Selfcare Sinners.'),
      (primary_store_id, 'contact', 'Contacto y soporte', 'support', 'Escríbenos desde la página de contacto con tu correo e ID de pedido si necesitas ayuda con una compra.', 'Contacto y soporte | Selfcare Sinners', 'Canales de contacto y soporte de Selfcare Sinners.')
    ON CONFLICT (store_id, slug)
    DO UPDATE SET
      title = EXCLUDED.title,
      page_type = EXCLUDED.page_type,
      content = EXCLUDED.content,
      seo_title = EXCLUDED.seo_title,
      seo_description = EXCLUDED.seo_description,
      status = 'published',
      updated_at = NOW();
  END IF;
END $$;

INSERT INTO operational_events(event_type, severity, message, metadata)
VALUES (
  'post_launch_04_migration_applied',
  'info',
  'POST-LAUNCH 04 content, email, reviews and retention migration applied.',
  jsonb_build_object('phase', 'POST-LAUNCH 04', 'area', 'content_email_reviews_retention')
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
