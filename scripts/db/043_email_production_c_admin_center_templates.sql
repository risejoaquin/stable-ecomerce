-- EMAIL PRODUCTION C: Admin Email Center + Premium Template Catalog
-- Idempotent migration for email template catalog/readiness metadata.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS email_template_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'system',
  criticality TEXT NOT NULL DEFAULT 'normal',
  default_subject TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_template_preview_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL,
  requested_by UUID NULL,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO email_template_catalog (template_key, name, category, criticality, default_subject, description)
VALUES
  ('verification_email', 'Verificación de cuenta', 'account', 'critical', 'Verifica tu cuenta en Selfcare Sinners', 'Confirma email del cliente y activa la cuenta.'),
  ('password_reset', 'Recuperación de contraseña', 'account', 'critical', 'Restablece tu contraseña', 'Permite recuperar acceso sin revelar existencia de cuenta.'),
  ('order_confirmation', 'Confirmación de pedido', 'commerce', 'critical', 'Confirmación de pedido Selfcare Sinners', 'Resumen de compra después del pago confirmado.'),
  ('order_status_update', 'Actualización de pedido', 'commerce', 'high', 'Actualización de tu pedido', 'Notifica enviado, entregado o cancelado.'),
  ('abandoned_cart_recovery', 'Recuperación de carrito', 'marketing', 'high', 'Completa tu compra en Selfcare Sinners', 'Recupera intención de compra con link canónico y dedupe.'),
  ('review_request', 'Solicitud de reseña', 'marketing', 'normal', 'Cuéntanos cómo fue tu experiencia', 'Solicita reseña post-compra.'),
  ('coupon_sent', 'Cupón / recompensa', 'marketing', 'normal', 'Tienes una recompensa disponible', 'Comunica cupones, puntos o beneficios.'),
  ('support_received', 'Soporte recibido', 'support', 'high', 'Recibimos tu mensaje', 'Confirma que soporte recibió el caso.'),
  ('contact_admin', 'Contacto a admin', 'support', 'high', 'Nuevo mensaje de contacto', 'Notificación interna para atención al cliente.'),
  ('newsletter_welcome', 'Bienvenida newsletter', 'marketing', 'normal', 'Bienvenida a Selfcare Sinners', 'Primer correo de relación de marca.')
ON CONFLICT (template_key) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  criticality = EXCLUDED.criticality,
  default_subject = EXCLUDED.default_subject,
  description = EXCLUDED.description,
  updated_at = NOW();

CREATE INDEX IF NOT EXISTS idx_email_template_catalog_category ON email_template_catalog(category, is_active);
CREATE INDEX IF NOT EXISTS idx_email_template_preview_events_template ON email_template_preview_events(template_key, created_at DESC);

NOTIFY pgrst, 'reload schema';
