import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { InboundEnvelopeSchema } from './channel-contracts.js';
import type { AiToolContext } from './tools/tool-types.js';
import { CustomerCareOrchestrator } from './customer-care-orchestrator.js';
import { PostgresMessagingState, type CommercialConversationSnapshot } from './postgres-messaging-state.js';

/** Factory must bind all mutating adapters to the provided transaction/snapshot. */
export class DurableCustomerCare {
  constructor(private readonly persistence: PostgresMessagingState,
    private readonly factory: (snapshot: CommercialConversationSnapshot, tx: PoolClient, scope: string) => CustomerCareOrchestrator) {}

  async run(raw: unknown, context: AiToolContext, approvedMutations: readonly string[] = []) {
    const inbound = InboundEnvelopeSchema.parse(raw);
    if (!context.isAuthenticated || !context.storeId || !context.userId || context.channel !== inbound.channel) {
      throw new Error('TRUSTED_CHANNEL_IDENTITY_REQUIRED');
    }
    const scope = JSON.stringify([context.storeId, context.userId, inbound.channel, inbound.conversationId]);
    const fingerprint = createHash('sha256').update(JSON.stringify([inbound, [...approvedMutations].sort()])).digest('hex');
    const outcome = await this.persistence.process(scope, inbound.eventId, fingerprint, async (snapshot, tx) => {
      const engine = this.factory(snapshot, tx, scope);
      engine.states.set(scope, structuredClone(snapshot.care));
      const result = await engine.run(inbound, context, approvedMutations);
      // Never persist a failed mutation as a successful processed event.
      if (result.toolResults.some(tool => !tool.success)) throw new Error('COMMERCIAL_ACTION_FAILED');
      snapshot.care = result.state;
      snapshot.messages.push({ messageId: inbound.eventId, state: 'PROCESSED', receivedAt: inbound.receivedAt });
      snapshot.outboundDelivery = { status: 'DRAFT_ONLY', draft: result.draft, liveSend: false };
      return result;
    });
    return outcome.result;
  }
}
