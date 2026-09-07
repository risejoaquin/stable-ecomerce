import crypto from 'crypto';
import { claimQueuedEmails, markEmailQueueFailed, markEmailQueueSent } from './email-queue.js';
import { isEmailSuppressed } from './email-deliverability.js';

export async function processEmailQueueBatch({ supabase, emailService, batchLimit = 25, logger }: { supabase: any; emailService: any; batchLimit?: number; logger?: any }) {
  const lockToken = crypto.randomUUID();
  const claimed = await claimQueuedEmails({ supabase, batchLimit, lockToken });
  const results = [] as Array<Record<string, unknown>>;

  for (const item of claimed) {
    try {
      const suppressed = await isEmailSuppressed({ supabase, email: item.recipient_email });
      if (suppressed) {
        await markEmailQueueFailed({ supabase, queueId: item.id, lockToken, errorMessage: 'Recipient suppressed', permanent: true });
        results.push({ id: item.id, status: 'suppressed' });
        continue;
      }

      const result = await emailService.send({
        to: item.recipient_email,
        subject: item.subject,
        html: item.html_body,
        purpose: item.purpose,
        entityType: item.entity_type,
        entityId: item.entity_id,
        metadata: item.metadata || {},
        dedupeKey: item.dedupe_key,
        throwOnError: false
      });

      if (result.success) {
        await markEmailQueueSent({ supabase, queueId: item.id, lockToken, providerMessageId: result.id || null });
        results.push({ id: item.id, status: 'sent' });
      } else {
        await markEmailQueueFailed({ supabase, queueId: item.id, lockToken, errorMessage: result.error || 'Email send failed' });
        results.push({ id: item.id, status: 'failed' });
      }
    } catch (error: any) {
      logger?.error?.({ err: error, queueId: item.id }, 'Email queue item failed');
      await markEmailQueueFailed({ supabase, queueId: item.id, lockToken, errorMessage: error?.message || 'Email queue item failed' });
      results.push({ id: item.id, status: 'failed' });
    }
  }

  return { lockToken, claimed: claimed.length, results };
}
