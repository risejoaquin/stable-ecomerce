import { buildAppLink, escapeHtml, sanitizeEmailUrl, safeText } from './email-sanitize.js';
import { buildSoftPremiumEmailLayout } from './email-template-system.js';
import type { EmailPurpose } from './email-types.js';

export type EmailTemplateDescriptor = {
  key: EmailPurpose;
  name: string;
  description: string;
  category: 'account' | 'commerce' | 'marketing' | 'support' | 'system';
  criticality: 'critical' | 'high' | 'normal';
  defaultSubject: string;
};

export const EMAIL_TEMPLATE_CATALOG: EmailTemplateDescriptor[] = [
  { key: 'verification_email', name: 'Verificación de cuenta', category: 'account', criticality: 'critical', defaultSubject: 'Verifica tu cuenta en Selfcare Sinners', description: 'Confirma email del cliente y activa la cuenta.' },
  { key: 'password_reset', name: 'Recuperación de contraseña', category: 'account', criticality: 'critical', defaultSubject: 'Restablece tu contraseña', description: 'Permite recuperar acceso sin revelar existencia de cuenta.' },
  { key: 'order_confirmation', name: 'Confirmación de pedido', category: 'commerce', criticality: 'critical', defaultSubject: 'Confirmación de pedido Selfcare Sinners', description: 'Resumen de compra después del pago confirmado.' },
  { key: 'order_status_update', name: 'Actualización de pedido', category: 'commerce', criticality: 'high', defaultSubject: 'Actualización de tu pedido', description: 'Notifica enviado, entregado o cancelado.' },
  { key: 'abandoned_cart_recovery', name: 'Recuperación de carrito', category: 'marketing', criticality: 'high', defaultSubject: 'Completa tu compra en Selfcare Sinners', description: 'Recupera intención de compra con link canónico y dedupe.' },
  { key: 'review_request', name: 'Solicitud de reseña', category: 'marketing', criticality: 'normal', defaultSubject: 'Cuéntanos cómo fue tu experiencia', description: 'Solicita reseña post-compra.' },
  { key: 'coupon_sent', name: 'Cupón / recompensa', category: 'marketing', criticality: 'normal', defaultSubject: 'Tienes una recompensa disponible', description: 'Comunica cupones, puntos o beneficios.' },
  { key: 'support_received', name: 'Soporte recibido', category: 'support', criticality: 'high', defaultSubject: 'Recibimos tu mensaje', description: 'Confirma que soporte recibió el caso.' },
  { key: 'contact_admin', name: 'Contacto a admin', category: 'support', criticality: 'high', defaultSubject: 'Nuevo mensaje de contacto', description: 'Notificación interna para atención al cliente.' },
  { key: 'newsletter_welcome', name: 'Bienvenida newsletter', category: 'marketing', criticality: 'normal', defaultSubject: 'Bienvenida a Selfcare Sinners', description: 'Primer correo de la relación de marca.' }
];

export function listEmailTemplates() {
  return EMAIL_TEMPLATE_CATALOG.map((template) => ({ ...template, previewAvailable: true }));
}

export function buildEmailTemplatePreview(purpose: EmailPurpose = 'generic') {
  const descriptor = EMAIL_TEMPLATE_CATALOG.find((template) => template.key === purpose) || {
    key: 'generic' as EmailPurpose,
    name: 'Correo genérico',
    description: 'Comunicación general de Selfcare Sinners.',
    defaultSubject: 'Actualización de Selfcare Sinners',
    category: 'system' as const,
    criticality: 'normal' as const
  };

  const sampleOrder = '#SS10458';
  const sampleCta = buildAppLink(purpose === 'abandoned_cart_recovery' ? '/recover' : '/');
  const body = `
    <p style="margin:0 0 16px">Hola, <strong>${escapeHtml('Sofía')}</strong>.</p>
    <p style="margin:0 0 16px">Este es un preview premium para <strong>${safeText(descriptor.name)}</strong>. Mantiene el sistema visual beige, jerarquía clara y contenido seguro.</p>
    <div style="margin:22px 0;padding:18px;border:1px solid #eadccf;border-radius:18px;background:#fff7ef">
      <p style="margin:0 0 6px;color:#8d725d;font-size:12px;text-transform:uppercase;letter-spacing:.14em">Referencia</p>
      <p style="margin:0;color:#241f1a;font-size:18px;font-weight:700">${safeText(sampleOrder)}</p>
      <p style="margin:8px 0 0;color:#7b6654">Skincare premium, comunicación limpia y CTA consistente.</p>
    </div>
  `;

  return {
    purpose: descriptor.key,
    name: descriptor.name,
    subject: descriptor.defaultSubject,
    html: buildSoftPremiumEmailLayout({
      title: descriptor.name,
      preheader: descriptor.description,
      body,
      ctaLabel: 'Abrir Selfcare Sinners',
      ctaHref: sanitizeEmailUrl(sampleCta)
    })
  };
}
