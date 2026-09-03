import crypto from 'crypto';
import type { EmailSendInput, EmailSendResult } from './email-types.js';
import { isValidEmail, normalizeRecipientEmail, safeHtmlBody, safeSubject } from './email-sanitize.js';
import { writeEmailEvent } from './email-events.js';
import { buildEmailDedupeKey, getEmailPolicy, resolveEmailPurpose } from './email-policy.js';

export class EmailService {
  private resend: any;
  private from: string;
  private logger: any;
  private getSupabase: () => any;

  constructor({ resend, from, logger, getSupabase }: { resend: any; from: string; logger?: any; getSupabase: () => any }) {
    this.resend = resend;
    this.from = String(from || '').trim();
    this.logger = logger;
    this.getSupabase = getSupabase;
  }

  private shouldAllowMockSend() {
    return process.env.EMAIL_ALLOW_MOCKS === 'true' || process.env.NODE_ENV !== 'production';
  }

  private async fail(input: EmailSendInput, eventId: string, dedupeKey: string, message: string, status: 'failed' | 'failed_validation' = 'failed'): Promise<EmailSendResult> {
    const purpose = resolveEmailPurpose(input.purpose);
    const to = normalizeRecipientEmail(input.to);
    const subject = safeSubject(input.subject);
    await writeEmailEvent({
      supabase: this.getSupabase(),
      to,
      subject,
      purpose,
      status,
      errorMessage: message,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      metadata: input.metadata || {},
      dedupeKey,
      requestId: eventId
    });
    if (input.throwOnError !== false && getEmailPolicy(purpose).defaultThrowOnError) throw new Error(message);
    if (input.throwOnError === true) throw new Error(message);
    return { success: false, status, error: message, eventId, dedupeKey };
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const eventId = crypto.randomUUID();
    const purpose = resolveEmailPurpose(input.purpose);
    const policy = getEmailPolicy(purpose);
    const to = normalizeRecipientEmail(input.to);
    const subject = safeSubject(input.subject);
    const html = safeHtmlBody(input.html);
    const dedupeKey = input.dedupeKey || buildEmailDedupeKey({ ...input, purpose, to, subject });
    const throwOnError = input.throwOnError ?? policy.defaultThrowOnError;

    if (policy.requiresValidRecipient && !isValidEmail(to)) {
      return this.fail({ ...input, purpose, throwOnError }, eventId, dedupeKey, 'Invalid email recipient', 'failed_validation');
    }

    if (!subject) {
      return this.fail({ ...input, purpose, throwOnError }, eventId, dedupeKey, 'Email subject is required', 'failed_validation');
    }

    if (!html) {
      return this.fail({ ...input, purpose, throwOnError }, eventId, dedupeKey, 'Email HTML body is required', 'failed_validation');
    }

    if (!this.from) {
      return this.fail({ ...input, purpose, throwOnError }, eventId, dedupeKey, 'EMAIL_FROM is not configured', 'failed_validation');
    }

    if (!this.resend) {
      if (!this.shouldAllowMockSend()) {
        return this.fail({ ...input, purpose, throwOnError }, eventId, dedupeKey, 'RESEND_API_KEY is not configured in production', 'failed');
      }

      const id = `mock-${eventId}`;
      this.logger?.info?.({ to, subject, purpose, eventId, dedupeKey }, '[Email Mock]');
      await writeEmailEvent({
        supabase: this.getSupabase(),
        to,
        subject,
        purpose,
        status: 'mocked',
        providerId: id,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        metadata: input.metadata || {},
        dedupeKey,
        requestId: eventId
      });
      return { success: true, mocked: true, id, status: 'mocked', eventId, dedupeKey };
    }

    try {
      const { data, error } = await this.resend.emails.send({ from: this.from, to, subject, html });
      if (error) {
        const message = error?.message || JSON.stringify(error);
        this.logger?.error?.({ err: error, to, purpose, eventId, dedupeKey }, 'Resend API Error');
        return this.fail({ ...input, purpose, throwOnError }, eventId, dedupeKey, message, 'failed');
      }

      const id = data?.id || data?.message_id || null;
      this.logger?.info?.({ providerMessageId: id, to, purpose, eventId, dedupeKey }, 'Email sent');
      await writeEmailEvent({
        supabase: this.getSupabase(),
        to,
        subject,
        purpose,
        status: 'sent',
        providerId: id,
        entityType: input.entityType || null,
        entityId: input.entityId || null,
        metadata: input.metadata || {},
        dedupeKey,
        requestId: eventId
      });
      return { success: true, id: id || undefined, status: 'sent', eventId, dedupeKey };
    } catch (error: any) {
      const message = error?.message || 'Email send failed';
      this.logger?.error?.({ err: error, to, purpose, eventId, dedupeKey }, 'Failed to send email');
      return this.fail({ ...input, purpose, throwOnError }, eventId, dedupeKey, message, 'failed');
    }
  }
}
