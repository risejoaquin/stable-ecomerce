import crypto from 'crypto';
import type { EmailPurpose } from './email-types.js';
import { buildEmailDedupeKey, resolveEmailPurpose } from './email-policy.js';
import { normalizeRecipientEmail, safeSubject, safeHtmlBody } from './email-sanitize.js';

export type EmailQueueStatus = 'queued' | 'processing' | 'sent' | 'failed' | 'suppressed' | 'cancelled';

export type QueueEmailInput = {
  to: string;
  subject: string;
  html: string;
  purpose?: EmailPurpose;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  dedupeKey?: string;
  scheduledFor?: string | null;
};

export function buildEmailQueueDedupeKey(input: QueueEmailInput): string {
  return (input.dedupeKey || buildEmailDedupeKey({
    purpose: input.purpose || 'generic',
    to: input.to,
    subject: input.subject,
    entityType: input.entityType || undefined,
    entityId: input.entityId || undefined,
    metadata: input.metadata || {}
  })).slice(0, 256);
}

export async function enqueueEmail({ supabase, input }: { supabase: any; input: QueueEmailInput }) {
  if (!supabase) throw new Error('Supabase client is required to enqueue email');

  const purpose = resolveEmailPurpose(input.purpose);
  const requestId = crypto.randomUUID();
  const payload = {
    request_id: requestId,
    dedupe_key: buildEmailQueueDedupeKey({ ...input, purpose }),
    status: 'queued' as EmailQueueStatus,
    purpose,
    recipient_email: normalizeRecipientEmail(input.to),
    subject: safeSubject(input.subject),
    html_body: safeHtmlBody(input.html),
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    metadata: input.metadata || {},
    scheduled_for: input.scheduledFor || new Date().toISOString(),
    attempts: 0,
    max_attempts: 3,
    next_attempt_at: input.scheduledFor || new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('email_queue')
    .upsert(payload, { onConflict: 'dedupe_key', ignoreDuplicates: true })
    .select('*')
    .maybeSingle();

  if (error) throw error;
  return data || payload;
}

export async function claimQueuedEmails({ supabase, batchLimit = 25, lockToken }: { supabase: any; batchLimit?: number; lockToken?: string }) {
  if (!supabase) return [];
  const effectiveLockToken = lockToken || crypto.randomUUID();
  const { data, error } = await supabase.rpc('claim_email_queue_for_delivery', {
    batch_limit: batchLimit,
    lock_token: effectiveLockToken
  });
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function markEmailQueueSent({ supabase, queueId, lockToken, providerMessageId }: { supabase: any; queueId: string; lockToken: string; providerMessageId?: string | null }) {
  if (!supabase) return;
  await supabase
    .from('email_queue')
    .update({
      status: 'sent',
      provider_message_id: providerMessageId || null,
      sent_at: new Date().toISOString(),
      locked_by: null,
      locked_until: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', queueId)
    .eq('locked_by', lockToken);
}

export async function markEmailQueueFailed({ supabase, queueId, lockToken, errorMessage, permanent = false }: { supabase: any; queueId: string; lockToken: string; errorMessage: string; permanent?: boolean }) {
  if (!supabase) return;
  const nextAttempt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await supabase
    .from('email_queue')
    .update({
      status: permanent ? 'failed' : 'queued',
      last_error: String(errorMessage || 'Email delivery failed').slice(0, 2000),
      next_attempt_at: permanent ? null : nextAttempt,
      locked_by: null,
      locked_until: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', queueId)
    .eq('locked_by', lockToken);
}
