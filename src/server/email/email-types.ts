export type EmailPurpose =
  | 'verification_email'
  | 'password_reset'
  | 'order_confirmation'
  | 'order_status_update'
  | 'admin_new_order'
  | 'coupon_sent'
  | 'abandoned_cart_recovery'
  | 'review_request'
  | 'newsletter_welcome'
  | 'support_received'
  | 'contact_admin'
  | 'generic';

export type EmailStatus =
  | 'requested'
  | 'mocked'
  | 'sent'
  | 'failed'
  | 'failed_validation'
  | 'suppressed';

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  purpose?: EmailPurpose;
  entityType?: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  throwOnError?: boolean;
  dedupeKey?: string;
};

export type EmailSendResult = {
  id?: string;
  eventId?: string;
  dedupeKey?: string;
  mocked?: boolean;
  success: boolean;
  status?: EmailStatus;
  error?: string;
};
