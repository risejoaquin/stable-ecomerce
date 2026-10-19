import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { createGoogleAiProvider } from './index.js';
import { DurableCustomerCare } from './durable-customer-care.js';
import { CustomerCareOrchestrator } from './customer-care-orchestrator.js';
import { PostgresMessagingState } from './postgres-messaging-state.js';
import { PostgresCommerceAdapter } from './tools/postgres-commerce-adapter.js';
import { AiToolRegistry } from './tools/tool-registry.js';
import type { AiToolContext } from './tools/tool-types.js';
import type { MessagingPipeline } from './messaging-router.js';
import type { NormalizedMetaWebhookEvent } from '../../services/meta-commerce/webhook-types.js';
import { normalizeMessagingBridgeEvent } from './meta-messaging-bridge.js';
import type { GoogleAiProvider } from './google-provider-types.js';
import type { MetaOutboundProvider } from '../meta-outbound/provider.js';
import { PostgresOutboundDeliveryRepository } from '../meta-outbound/postgres-repository.js';
import { DurableOutboundWorker } from '../meta-outbound/worker.js';

export interface BlackRelicSalesRuntimeOptions {
  pool: Pool;
  storeId: string;
  appSecret: string;
  verifyToken: string;
  providerMode?: 'mock' | 'real';
  provider?: GoogleAiProvider;
  /** Local/integration-only server-owned context; never derived from inbound payload. */
  identityContext?: Partial<AiToolContext>;
  /** Optional external boundary provider. Omit in production to keep live sends disabled. */
  outboundProvider?: MetaOutboundProvider;
}

/** Explicit composition root. Nothing is created by importing this module. */
export function createBlackRelicSalesRuntime(options: BlackRelicSalesRuntimeOptions): {
  webhookConfig: { appSecret: string; verifyToken: string };
  pipeline: MessagingPipeline;
} {
  if (!options.pool || !options.storeId || !options.appSecret || !options.verifyToken) throw new Error('SALES_RUNTIME_CONFIG_REQUIRED');
  const provider = options.provider ?? createGoogleAiProvider({ mode: options.providerMode ?? 'real' });
  const persistence = new PostgresMessagingState(options.pool);
  const durable = new DurableCustomerCare(persistence, (_snapshot, tx, scope) => {
    const adapter = new PostgresCommerceAdapter(tx, options.storeId, scope);
    return new CustomerCareOrchestrator(provider, new AiToolRegistry(adapter));
  });
  return {
    webhookConfig: { appSecret: options.appSecret, verifyToken: options.verifyToken },
    pipeline: {
      orchestrator: durable,
      resolveIdentity: async (event: NormalizedMetaWebhookEvent): Promise<AiToolContext> => {
        const binding = await options.pool.query(`SELECT store_id FROM relic_messaging.channel_bindings
          WHERE channel=$1 AND recipient_id=$2 AND enabled=true`, [event.channel, event.recipientId]);
        if (binding.rows.length !== 1 || String(binding.rows[0].store_id) !== options.storeId) throw new Error('UNBOUND_CHANNEL_IDENTITY');
        const userId = createHash('sha256').update(`${event.channel}:${event.externalUserId}`).digest('hex');
        return { ...options.identityContext, storeId: options.storeId, userId, isAuthenticated: true, channel: event.channel, correlationId: event.eventId };
      },
      persistDraft: async (event, result) => {
        const client = await options.pool.connect();
        try {
          await client.query('BEGIN');
          const payload = normalizeMessagingBridgeEvent(event);
          const id = `${options.storeId}:${payload.eventId}`;
          const fingerprint = createHash('sha256').update(JSON.stringify(result.draft)).digest('hex');
          await client.query(`INSERT INTO relic_messaging.outbound_messages
            (id,store_id,channel,conversation_id,external_recipient_id,related_inbound_event_id,payload,payload_fingerprint,status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'QUEUED') ON CONFLICT (id) DO NOTHING`,
          [id, options.storeId, result.draft.channel, result.draft.conversationId, result.draft.recipientId, payload.eventId,
            JSON.stringify(result.draft), fingerprint]);
          await client.query('COMMIT');
          if (options.outboundProvider) {
            const worker = new DurableOutboundWorker(new PostgresOutboundDeliveryRepository(client, options.storeId), options.outboundProvider, { batchSize: 10, maxAttempts: 3 });
            await worker.runBatch();
          }
        } catch (error) { await client.query('ROLLBACK').catch(() => undefined); throw error; } finally { client.release(); }
      },
    },
  };
}
