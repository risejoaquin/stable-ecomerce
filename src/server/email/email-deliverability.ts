import { normalizeRecipientEmail } from './email-sanitize.js';

export type SuppressionReason = 'bounce' | 'complaint' | 'manual' | 'unsubscribe';

export async function isEmailSuppressed({ supabase, email }: { supabase: any; email: string }) {
  if (!supabase) return false;
  const normalized = normalizeRecipientEmail(email);
  if (!normalized) return false;
  const { data, error } = await supabase
    .from('email_suppression_list')
    .select('id')
    .eq('email', normalized)
    .eq('is_active', true)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.id);
}

export async function suppressEmail({ supabase, email, reason, providerMessageId = null, metadata = {} }: { supabase: any; email: string; reason: SuppressionReason; providerMessageId?: string | null; metadata?: Record<string, unknown> }) {
  if (!supabase) return;
  const normalized = normalizeRecipientEmail(email);
  if (!normalized) return;
  await supabase.from('email_suppression_list').upsert({
    email: normalized,
    reason,
    provider: 'resend',
    provider_message_id: providerMessageId,
    metadata,
    is_active: true,
    suppressed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'email,reason' });
}
