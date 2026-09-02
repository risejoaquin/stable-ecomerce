import type { EmailPurpose } from './email-types.js';

export async function writeEmailEvent({
  supabase,
  to,
  subject,
  purpose = 'generic',
  status,
  providerId = null,
  errorMessage = null,
  entityType = null,
  entityId = null,
  metadata = {}
}: {
  supabase: any;
  to: string;
  subject: string;
  purpose?: EmailPurpose;
  status: 'mocked' | 'sent' | 'failed';
  providerId?: string | null;
  errorMessage?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (!supabase) return;
  try {
    await supabase.from('email_events').insert({
      order_id: entityType === 'order' ? entityId : null,
      user_id: entityType === 'user' ? entityId : null,
      email: to,
      event_type: purpose,
      provider: 'resend',
      provider_message_id: providerId,
      subject,
      status,
      error_message: errorMessage,
      metadata: { ...(metadata || {}), entityType, entityId },
      created_at: new Date().toISOString()
    });
  } catch (_error) {
    // Email observability must never break customer or admin flows.
  }
}
