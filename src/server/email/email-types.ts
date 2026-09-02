export type EmailPurpose =
  | 'verification_email'
  | 'password_reset'
  | 'order_confirmation'
  | 'order_status_update'
  | 'admin_new_order'
  | 'coupon_sent'
  | 'abandoned_cart_recovery'
  | 'contact_admin'
  | 'generic';

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  purpose?: EmailPurpose;
  entityType?: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  throwOnError?: boolean;
};

export type EmailSendResult = {
  id?: string;
  mocked?: boolean;
  success: boolean;
  error?: string;
};
