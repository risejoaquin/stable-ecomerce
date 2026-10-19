import { z } from 'zod';

export const InboundEnvelopeSchema = z.object({
  eventId: z.string().min(1).max(200), conversationId: z.string().min(1).max(200),
  externalUserId: z.string().min(1).max(200), recipientId: z.string().min(1).max(200),
  channel: z.enum(['instagram', 'messenger']), text: z.string().trim().min(1).max(4000),
  receivedAt: z.string().datetime(), replyTo: z.string().max(200).optional(),
  productContext: z.string().max(200).optional(),
}).strict();
export type InboundEnvelope = z.infer<typeof InboundEnvelopeSchema>;
export interface ChannelAuthorization {
  authorized: boolean;
  customerServiceWindowEndsAt: string | null;
}
export interface ResponseDraft {
  eventId: string; conversationId: string; channel: InboundEnvelope['channel'];
  recipientId: string; text: string; handoffRequired: boolean;
  status: 'DRAFT_ONLY'; liveSend: false;
}
export function channelPolicyAllowsDraftDelivery(auth: ChannelAuthorization, now = Date.now()): boolean {
  const deadline = auth.customerServiceWindowEndsAt ? Date.parse(auth.customerServiceWindowEndsAt) : NaN;
  return auth.authorized === true && Number.isFinite(deadline) && now < deadline;
}
/** Transport deliberately has no network implementation or credential input. */
export class DisabledMetaSender {
  async send(_draft: ResponseDraft, _auth?: ChannelAuthorization) {
    return { status: 'BLOCKED' as const, reason: 'LIVE_SENDER_DISABLED', realMessagesSent: 0 };
  }
}
