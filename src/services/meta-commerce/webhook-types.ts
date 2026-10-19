import { z } from 'zod';
import type { ConversationDomainEvent } from '../../types/meta-commerce';

/**
 * Meta Webhook Signature Algorithms.
 */
export const META_SIGNATURE_ALGORITHMS = ['sha256'] as const;
export type MetaSignatureAlgorithm = (typeof META_SIGNATURE_ALGORITHMS)[number];

/**
 * Supported Instagram webhook event types normalized by the ingestion layer.
 */
export const MetaEventTypeSchema = z.enum([
  'message',
  'story_reply',
  'comment',
  'unsupported',
]);
export type MetaEventType = z.infer<typeof MetaEventTypeSchema>;

/**
 * Meta Graph API: Messaging sender/recipient structure.
 */
export const MetaMessagingParticipantSchema = z.object({
  id: z.string().min(1, 'Participant id is required'),
});

/**
 * Meta Graph API: Story reply reference structure.
 */
export const MetaStoryReplyReferenceSchema = z.object({
  story: z.object({
    id: z.string().min(1, 'Story ID is required'),
    url: z.string().url().optional(),
  }),
});

/**
 * Meta Graph API: Inbound message payload structure.
 */
export const MetaMessagingMessageSchema = z.object({
  mid: z.string().min(1, 'Message ID (mid) is required'),
  text: z.string().optional(),
  reply_to: MetaStoryReplyReferenceSchema.optional(),
  attachments: z.array(z.record(z.string(), z.unknown())).optional(),
  quick_reply: z.record(z.string(), z.unknown()).optional(),
  is_echo: z.boolean().optional(),
});
export type MetaMessagingMessage = z.infer<typeof MetaMessagingMessageSchema>;

/**
 * Meta Graph API: Messaging entry in webhook payload.
 */
export const MetaMessagingEntrySchema = z.object({
  sender: MetaMessagingParticipantSchema,
  recipient: MetaMessagingParticipantSchema,
  timestamp: z.number().int().positive('Timestamp must be a positive integer'),
  message: MetaMessagingMessageSchema.optional(),
});
export type MetaMessagingEntry = z.infer<typeof MetaMessagingEntrySchema>;

/**
 * Meta Graph API: Comment value structure in webhook changes.
 */
export const MetaCommentValueSchema = z.object({
  id: z.string().min(1, 'Comment ID is required'),
  text: z.string().min(1, 'Comment text is required'),
  from: z.object({
    id: z.string().min(1, 'Commenter ID is required'),
    username: z.string().optional(),
  }),
  post_id: z.string().optional(),
  media: z
    .object({
      id: z.string().optional(),
      media_product_type: z.string().optional(),
    })
    .optional(),
  parent_id: z.string().optional(),
  created_time: z.number().optional(),
});
export type MetaCommentValue = z.infer<typeof MetaCommentValueSchema>;

/**
 * Meta Graph API: Field change entry (used for comments/mentions).
 */
export const MetaChangeEntrySchema = z.object({
  field: z.string().min(1),
  value: MetaCommentValueSchema.or(z.record(z.string(), z.unknown())),
});
export type MetaChangeEntry = z.infer<typeof MetaChangeEntrySchema>;

/**
 * Meta Graph API: Top-level entry in webhook payload.
 */
export const MetaWebhookEntrySchema = z.object({
  id: z.string().min(1, 'Entry ID is required'),
  time: z.number().optional(),
  messaging: z.array(MetaMessagingEntrySchema).optional(),
  changes: z.array(MetaChangeEntrySchema).optional(),
});
export type MetaWebhookEntry = z.infer<typeof MetaWebhookEntrySchema>;

/**
 * Meta Graph API: Top-level webhook envelope payload schema.
 */
export const MetaWebhookPayloadSchema = z.object({
  object: z.enum(['instagram', 'page']),
  entry: z.array(MetaWebhookEntrySchema).min(1, 'Payload must contain at least one entry'),
});
export type MetaWebhookPayload = z.infer<typeof MetaWebhookPayloadSchema>;

/**
 * Normalized internal event representation for commerce messaging.
 */
export interface NormalizedMetaWebhookEvent {
  eventId: string;
  channel: 'instagram' | 'messenger';
  eventType: MetaEventType;
  externalUserId: string;
  recipientId: string;
  conversationId: string;
  messageId: string;
  text: string;
  timestamp: string;
  rawTimestamp: number;
  metadata: {
    isStoryReply: boolean;
    storyId?: string;
    storyUrl?: string;
    commentId?: string;
    postId?: string;
    mediaId?: string;
    fromUsername?: string;
    isEcho?: boolean;
    simulationMode: true;
    rawPayloadHash: string;
  };
  domainEvent: ConversationDomainEvent;
}

/**
 * Result of cryptographic signature verification.
 */
export interface MetaSignatureVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Result of GET challenge verification.
 */
export interface MetaVerificationHandshakeResult {
  valid: boolean;
  challenge?: string;
  reason?: string;
}

/**
 * Record stored in idempotency cache.
 */
export interface WebhookIdempotencyRecord {
  eventId: string;
  processedAt: string;
  status: 'processed' | 'duplicate';
  rawPayloadHash: string;
  channel: string;
}

/**
 * Result of high-level webhook ingestion.
 */
export interface WebhookIngestionResult {
  received: boolean;
  processed: boolean;
  duplicate?: boolean;
  eventsCount: number;
  events: NormalizedMetaWebhookEvent[];
  errors?: string[];
  simulationMode: true;
}
