import type { EmailPurpose } from './email-types.js';

export type EmailPolicy = {
  purpose: EmailPurpose;
  category: 'transactional' | 'operational' | 'marketing' | 'lifecycle';
  requiresValidRecipient: boolean;
  requiresDedupeKey: boolean;
  defaultThrowOnError: boolean;
};

const EMAIL_POLICIES: Record<EmailPurpose, EmailPolicy> = {
  verification_email: { purpose: 'verification_email', category: 'transactional', requiresValidRecipient: true, requiresDedupeKey: false, defaultThrowOnError: true },
  password_reset: { purpose: 'password_reset', category: 'transactional', requiresValidRecipient: true, requiresDedupeKey: false, defaultThrowOnError: true },
  order_confirmation: { purpose: 'order_confirmation', category: 'transactional', requiresValidRecipient: true, requiresDedupeKey: false, defaultThrowOnError: true },
  order_status_update: { purpose: 'order_status_update', category: 'transactional', requiresValidRecipient: true, requiresDedupeKey: false, defaultThrowOnError: false },
  admin_new_order: { purpose: 'admin_new_order', category: 'operational', requiresValidRecipient: true, requiresDedupeKey: false, defaultThrowOnError: false },
  coupon_sent: { purpose: 'coupon_sent', category: 'marketing', requiresValidRecipient: true, requiresDedupeKey: true, defaultThrowOnError: false },
  abandoned_cart_recovery: { purpose: 'abandoned_cart_recovery', category: 'lifecycle', requiresValidRecipient: true, requiresDedupeKey: true, defaultThrowOnError: false },
  review_request: { purpose: 'review_request', category: 'lifecycle', requiresValidRecipient: true, requiresDedupeKey: true, defaultThrowOnError: false },
  newsletter_welcome: { purpose: 'newsletter_welcome', category: 'marketing', requiresValidRecipient: true, requiresDedupeKey: true, defaultThrowOnError: false },
  support_received: { purpose: 'support_received', category: 'operational', requiresValidRecipient: true, requiresDedupeKey: false, defaultThrowOnError: false },
  contact_admin: { purpose: 'contact_admin', category: 'operational', requiresValidRecipient: true, requiresDedupeKey: false, defaultThrowOnError: true },
  generic: { purpose: 'generic', category: 'operational', requiresValidRecipient: true, requiresDedupeKey: false, defaultThrowOnError: false }
};

export function resolveEmailPurpose(value?: string | null): EmailPurpose {
  const raw = String(value || 'generic').trim() as EmailPurpose;
  return EMAIL_POLICIES[raw] ? raw : 'generic';
}

export function getEmailPolicy(value?: string | null): EmailPolicy {
  return EMAIL_POLICIES[resolveEmailPurpose(value)];
}

export function buildEmailDedupeKey(input: { purpose?: string | null; to?: string | null; entityType?: string | null; entityId?: string | null; subject?: string | null; metadata?: Record<string, unknown> | null }): string {
  const metadataKey = input.metadata?.dedupeKey || input.metadata?.dedupe_key || null;
  if (metadataKey) return String(metadataKey).slice(0, 256);
  const purpose = resolveEmailPurpose(input.purpose);
  const to = String(input.to || '').trim().toLowerCase();
  const entity = input.entityId ? `${input.entityType || 'entity'}:${input.entityId}` : String(input.subject || '').trim().toLowerCase().slice(0, 100);
  return `${purpose}:${to}:${entity}`.slice(0, 256);
}
