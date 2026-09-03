import type { EmailPurpose, EmailStatus } from './email-types.js';

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
  metadata = {},
  dedupeKey = null,
  requestId = null
}: {
  supabase: any;
  to: string;
  subject: string;
  purpose?: EmailPurpose;
  status: EmailStatus;
  providerId?: string | null;
  errorMessage?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  dedupeKey?: string | null;
  requestId?: string | null;
}) {
  if (!supabase) return;

  const payload = {
    order_id: entityType === 'order' ? entityId : null,
    user_id: entityType === 'user' ? entityId : null,
    email: to,
    event_type: purpose,
    provider: 'resend',
    provider_message_id: providerId,
    subject,
    status,
    error_message: errorMessage,
    dedupe_key: dedupeKey,
    request_id: requestId,
    metadata: { ...(metadata || {}), entityType, entityId, dedupeKey, requestId },
    created_at: new Date().toISOString()
  };

  try {
    await supabase.from('email_events').insert(payload);
  } catch (_error) {
    // Backward compatible fallback for databases that have not applied EMAIL PRODUCTION A yet.
    try {
      const { dedupe_key, request_id, ...legacyPayload } = payload;
      await supabase.from('email_events').insert(legacyPayload);
    } catch (_legacyError) {
      // Email observability must never break customer or admin flows.
    }
  }
}
