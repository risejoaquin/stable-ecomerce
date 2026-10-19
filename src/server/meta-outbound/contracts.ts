import { z } from 'zod';

export const OutboundChannelSchema = z.enum(['instagram', 'messenger']);
export const OutboundKindSchema = z.enum(['text', 'fallback', 'handoff']);

export const NormalizedOutboundMessageSchema = z.object({
  idempotencyKey: z.string().trim().min(1).max(200),
  correlationId: z.string().trim().min(1).max(200),
  conversationId: z.string().trim().min(1).max(200),
  recipientId: z.string().trim().min(1).max(200),
  channel: OutboundChannelSchema,
  kind: OutboundKindSchema,
  text: z.string().trim().min(1).max(2000),
  replyToMessageId: z.string().trim().min(1).max(200).optional(),
}).strict();

export type NormalizedOutboundMessage = z.infer<typeof NormalizedOutboundMessageSchema>;
export type OutboundChannel = z.infer<typeof OutboundChannelSchema>;
export type OutboundKind = z.infer<typeof OutboundKindSchema>;

export type OutboundDeliveryStatus = 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'RETRYABLE' | 'RETRYABLE_FAILURE';

export interface OutboundDeliveryRecord {
  id: string;
  message: NormalizedOutboundMessage;
  payloadFingerprint: string;
  status: OutboundDeliveryStatus;
  attemptCount: number;
  externalMessageId: string | null;
  lastErrorCode: string | null;
  createdAt: string;
  updatedAt: string;
  sentAt: string | null;
}

export type OutboundSendResult =
  | { status: 'SENT'; record: OutboundDeliveryRecord; duplicate: boolean }
  | { status: 'FAILED' | 'RETRYABLE'; record: OutboundDeliveryRecord; duplicate: boolean };
