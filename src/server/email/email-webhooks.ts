import crypto from 'crypto';
import { normalizeRecipientEmail } from './email-sanitize.js';
import { suppressEmail } from './email-deliverability.js';

export type ResendWebhookEvent = {
  type?: string;
  created_at?: string;
  data?: Record<string, any>;
};

export function verifyResendWebhookSignature({ rawBody, signature, secret }: { rawBody: string; signature?: string | null; secret?: string | null }) {
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const received = String(signature).replace(/^sha256=/, '');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
  } catch (_error) {
    return false;
  }
}

export function getResendEventStatus(type?: string) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('delivered')) return 'delivered';
  if (normalized.includes('bounced')) return 'bounced';
  if (normalized.includes('complained')) return 'complained';
  if (normalized.includes('delivery_delayed')) return 'delivery_delayed';
  if (normalized.includes('opened')) return 'opened';
  if (normalized.includes('clicked')) return 'clicked';
  if (normalized.includes('sent')) return 'sent';
  return 'received';
}

export async function processResendWebhookEvent({ supabase, event }: { supabase: any; event: ResendWebhookEvent }) {
  if (!supabase) return { processed: false };
  const data = event?.data || {};
  const providerMessageId = data.email_id || data.id || data.message_id || null;
  const recipient = normalizeRecipientEmail(data.to || data.recipient || data.email || '');
  const status = getResendEventStatus(event?.type);

  await supabase.from('email_events').insert({
    email: recipient,
    event_type: `resend.${event?.type || 'unknown'}`,
    provider: 'resend',
    provider_message_id: providerMessageId,
    status,
    subject: data.subject || null,
    metadata: { resendEvent: event },
    created_at: new Date().toISOString()
  });

  if (providerMessageId) {
    await supabase.from('email_queue').update({
      status: status === 'bounced' || status === 'complained' ? 'failed' : status,
      provider_status: status,
      updated_at: new Date().toISOString()
    }).eq('provider_message_id', providerMessageId);
  }

  if (recipient && status === 'bounced') await suppressEmail({ supabase, email: recipient, reason: 'bounce', providerMessageId, metadata: { event } });
  if (recipient && status === 'complained') await suppressEmail({ supabase, email: recipient, reason: 'complaint', providerMessageId, metadata: { event } });

  return { processed: true, status, providerMessageId };
}
