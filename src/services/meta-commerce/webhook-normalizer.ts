import crypto from 'node:crypto';
import {
  MetaWebhookPayloadSchema,
  type MetaWebhookPayload,
  type NormalizedMetaWebhookEvent,
  type MetaEventType,
} from './webhook-types';

export class MalformedWebhookPayloadError extends Error {
  constructor(message: string, public readonly validationErrors?: unknown) {
    super(message);
    this.name = 'MalformedWebhookPayloadError';
  }
}

/**
 * Computes deterministic SHA-256 hash of any input string.
 */
export function hashString(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Generates a stable, collision-resistant, deterministic event ID for Meta webhook events.
 */
export function generateDeterministicEventId(params: {
  channel: string;
  eventType: MetaEventType;
  recipientId: string;
  externalUserId: string;
  messageId: string;
  extraIdentifier?: string;
}): string {
  const normalizedKey = [
    params.channel.toLowerCase(),
    params.eventType.toLowerCase(),
    params.recipientId.trim(),
    params.externalUserId.trim(),
    params.messageId.trim(),
    (params.extraIdentifier || '').trim(),
  ].join('::');

  const digest = hashString(normalizedKey);
  const prefix = params.eventType === 'comment' ? 'cmt' : params.eventType === 'story_reply' ? 'sty' : 'msg';
  return `meta_evt_${prefix}_${digest.slice(0, 24)}`;
}

/**
 * Generates canonical conversation thread key scoped by channel, business recipient, and customer.
 */
export function generateConversationId(channel: string, recipientId: string, externalUserId: string): string {
  return `${channel.toLowerCase()}:${recipientId.trim()}:${externalUserId.trim()}`;
}

/**
 * Normalizes raw Meta webhook payload into an array of canonical NormalizedMetaWebhookEvent.
 *
 * Requirements:
 * - Validates schema with Zod, throwing MalformedWebhookPayloadError on failure.
 * - Extracts text DMs, story replies, and comments.
 * - Produces deterministic event IDs.
 * - Attaches INBOUND_MESSAGE_RECEIVED domain event ready for conversation state machine.
 */
export function normalizeMetaWebhookPayload(
  rawPayload: unknown,
  options: { simulationMode?: boolean } = {},
): NormalizedMetaWebhookEvent[] {
  const parseResult = MetaWebhookPayloadSchema.safeParse(rawPayload);

  if (!parseResult.success) {
    const errorDetails = parseResult.error.flatten();
    throw new MalformedWebhookPayloadError(
      `Malformed Meta webhook payload: ${parseResult.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ')}`,
      errorDetails,
    );
  }

  const payload: MetaWebhookPayload = parseResult.data;
  const channel = payload.object === 'page' ? 'messenger' : 'instagram';
  const rawPayloadHash = hashString(JSON.stringify(rawPayload));
  const events: NormalizedMetaWebhookEvent[] = [];

  for (const entry of payload.entry) {
    const entryId = entry.id;

    // 1. Process messaging entries (DMs, Story Replies)
    if (Array.isArray(entry.messaging)) {
      for (const msgEntry of entry.messaging) {
        if (!msgEntry.message) {
          // Delivery/read receipt or message without body, skip
          continue;
        }

        const msg = msgEntry.message;
        // Outbound echoes must never re-enter automation as customer requests.
        if (msg.is_echo) continue;
        const senderId = msgEntry.sender.id;
        const recipientId = msgEntry.recipient.id;
        const rawTimestamp = msgEntry.timestamp;
        const timestampIso = new Date(rawTimestamp).toISOString();

        const isStoryReply = Boolean(msg.reply_to?.story);
        const storyId = msg.reply_to?.story?.id;
        const storyUrl = msg.reply_to?.story?.url;
        const eventType: MetaEventType = isStoryReply ? 'story_reply' : 'message';

        const eventId = generateDeterministicEventId({
          channel,
          eventType,
          recipientId,
          externalUserId: senderId,
          messageId: msg.mid,
          extraIdentifier: storyId,
        });

        const conversationId = generateConversationId(channel, recipientId, senderId);
        const text = (msg.text || '').trim();

        events.push({
          eventId,
          channel,
          eventType,
          externalUserId: senderId,
          recipientId,
          conversationId,
          messageId: msg.mid,
          text,
          timestamp: timestampIso,
          rawTimestamp,
          metadata: {
            isStoryReply,
            storyId,
            storyUrl,
            isEcho: Boolean(msg.is_echo),
            simulationMode: true,
            rawPayloadHash,
          },
          domainEvent: {
            type: 'INBOUND_MESSAGE_RECEIVED',
            messageId: msg.mid,
            text,
            timestamp: timestampIso,
          },
        });
      }
    }

    // 2. Process changes entries (Comments)
    if (payload.object === 'instagram' && Array.isArray(entry.changes)) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          const val = change.value as any;
          if (val && typeof val === 'object' && val.id && val.from?.id) {
            const commentId = String(val.id);
            const commenterId = String(val.from.id);
            const commenterUsername = val.from.username ? String(val.from.username) : undefined;
            const text = String(val.text || '').trim();
            const postId = val.post_id ? String(val.post_id) : undefined;
            const mediaId = val.media?.id ? String(val.media.id) : undefined;

            const rawTimestamp = typeof val.created_time === 'number'
              ? val.created_time * 1000
              : entry.time || Date.now();
            const timestampIso = new Date(rawTimestamp).toISOString();

            const eventId = generateDeterministicEventId({
              channel: 'instagram',
              eventType: 'comment',
              recipientId: entryId,
              externalUserId: commenterId,
              messageId: commentId,
              extraIdentifier: postId,
            });

            const conversationId = generateConversationId('instagram', entryId, commenterId);

            events.push({
              eventId,
              channel: 'instagram',
              eventType: 'comment',
              externalUserId: commenterId,
              recipientId: entryId,
              conversationId,
              messageId: commentId,
              text,
              timestamp: timestampIso,
              rawTimestamp,
              metadata: {
                isStoryReply: false,
                commentId,
                postId,
                mediaId,
                fromUsername: commenterUsername,
                simulationMode: true,
                rawPayloadHash,
              },
              domainEvent: {
                type: 'INBOUND_MESSAGE_RECEIVED',
                messageId: commentId,
                text,
                timestamp: timestampIso,
              },
            });
          }
        }
      }
    }
  }

  return events;
}
