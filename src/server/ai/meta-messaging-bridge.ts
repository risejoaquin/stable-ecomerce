import { InboundEnvelopeSchema } from './channel-contracts.js';
import type { AiToolContext } from './tools/tool-types.js';
import type { CustomerCareOrchestrator } from './customer-care-orchestrator.js';

/** Receives a verified/normalized event from the upstream webhook, never a raw request body. */
export function normalizeMessagingBridgeEvent(event: any) {
  if (!event || !['instagram', 'messenger', 'page'].includes(event.channel)) throw new Error('UNSUPPORTED_CHANNEL');
  return InboundEnvelopeSchema.parse({ eventId: event.eventId, conversationId: event.conversationId,
    externalUserId: event.externalUserId, recipientId: event.recipientId,
    channel: event.channel === 'page' ? 'messenger' : event.channel,
    text: event.text, receivedAt: event.timestamp,
    ...(event.metadata?.storyId ? { replyTo: event.metadata.storyId } : {}),
  });
}
export function prepareMessagingResponse(event: unknown, context: AiToolContext, orchestrator: CustomerCareOrchestrator) {
  return orchestrator.run(normalizeMessagingBridgeEvent(event), context);
}
