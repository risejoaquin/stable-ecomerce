import type { EmailSendInput, EmailSendResult } from './email-types.js';
import { isValidEmail, normalizeRecipientEmail } from './email-sanitize.js';
import { writeEmailEvent } from './email-events.js';

export class EmailService {
  private resend: any;
  private from: string;
  private logger: any;
  private getSupabase: () => any;

  constructor({ resend, from, logger, getSupabase }: { resend: any; from: string; logger?: any; getSupabase: () => any }) {
    this.resend = resend;
    this.from = from;
    this.logger = logger;
    this.getSupabase = getSupabase;
  }

  async send(input: EmailSendInput): Promise<EmailSendResult> {
    const to = normalizeRecipientEmail(input.to);
    const subject = String(input.subject || '').trim();

    if (!isValidEmail(to)) {
      const message = 'Invalid email recipient';
      await writeEmailEvent({ supabase: this.getSupabase(), to, subject, purpose: input.purpose, status: 'failed', errorMessage: message, entityType: input.entityType || null, entityId: input.entityId || null, metadata: input.metadata || {} });
      if (input.throwOnError !== false) throw new Error(message);
      return { success: false, error: message };
    }

    if (!this.resend) {
      const id = `mock-${Date.now()}`;
      this.logger?.info?.(`[Email Mock] To: ${to} | Subject: ${subject}`);
      await writeEmailEvent({ supabase: this.getSupabase(), to, subject, purpose: input.purpose, status: 'mocked', providerId: id, entityType: input.entityType || null, entityId: input.entityId || null, metadata: input.metadata || {} });
      return { success: true, mocked: true, id };
    }

    try {
      const { data, error } = await this.resend.emails.send({ from: this.from, to, subject, html: input.html });
      if (error) {
        const message = error?.message || JSON.stringify(error);
        this.logger?.error?.({ err: error, to, purpose: input.purpose }, 'Resend API Error');
        await writeEmailEvent({ supabase: this.getSupabase(), to, subject, purpose: input.purpose, status: 'failed', errorMessage: message, entityType: input.entityType || null, entityId: input.entityId || null, metadata: input.metadata || {} });
        if (input.throwOnError !== false) throw new Error(message);
        return { success: false, error: message };
      }

      const id = data?.id || data?.message_id || null;
      this.logger?.info?.({ data, to, purpose: input.purpose }, 'Email sent');
      await writeEmailEvent({ supabase: this.getSupabase(), to, subject, purpose: input.purpose, status: 'sent', providerId: id, entityType: input.entityType || null, entityId: input.entityId || null, metadata: input.metadata || {} });
      return { success: true, id: id || undefined };
    } catch (error: any) {
      const message = error?.message || 'Email send failed';
      this.logger?.error?.({ err: error, to, purpose: input.purpose }, 'Failed to send email');
      await writeEmailEvent({ supabase: this.getSupabase(), to, subject, purpose: input.purpose, status: 'failed', errorMessage: message, entityType: input.entityType || null, entityId: input.entityId || null, metadata: input.metadata || {} });
      if (input.throwOnError !== false) throw error;
      return { success: false, error: message };
    }
  }
}
