import express from 'express';
import rateLimit from 'express-rate-limit';
import { MetaWebhookIngestionService, type MetaWebhookIngestionConfig } from '../../services/meta-commerce/webhook-ingestion.js';
import type { NormalizedMetaWebhookEvent } from '../../services/meta-commerce/webhook-types.js';
import { normalizeMessagingBridgeEvent } from './meta-messaging-bridge.js';
import type { CustomerCareOrchestrator, CareResult } from './customer-care-orchestrator.js';
import type { AiToolContext } from './tools/tool-types.js';

export interface MessagingPipeline {
  orchestrator: Pick<CustomerCareOrchestrator, 'run'>;
  // Resolve using server-owned channel bindings; a signed sender ID is not a webshop login.
  resolveIdentity(event: NormalizedMetaWebhookEvent): Promise<AiToolContext>;
  persistDraft(event: NormalizedMetaWebhookEvent, result: CareResult): Promise<void>;
}

/** Mount BEFORE express.json(); no outbound transport is enabled by this router. */
export function createMessagingRouter(config: MetaWebhookIngestionConfig, pipeline: MessagingPipeline) {
  const router = express.Router();
  const service = new MetaWebhookIngestionService(config, {
    processEvent: async event => {
      if (event.eventType === 'comment' || !event.text.trim()) return;
      const identity = await pipeline.resolveIdentity(event);
      if (identity.channel !== event.channel || !identity.storeId || !identity.userId || !identity.isAuthenticated) {
        throw new Error('UNBOUND_CHANNEL_IDENTITY');
      }
      const result = await pipeline.orchestrator.run(normalizeMessagingBridgeEvent(event), identity);
      await pipeline.persistDraft(event, result);
    },
  });
  router.get('/', (req, res) => {
    const result = service.handleVerificationHandshake(req.query);
    if (result.statusCode === 200) return res.type('text/plain').send(result.challenge);
    return res.status(result.statusCode).json({ error: 'verification_failed' });
  });
  router.post('/', rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }),
    express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
      if (!Buffer.isBuffer(req.body)) return res.status(400).json({ error: 'raw_body_required' });
      try {
        const result = await service.ingestPayload(req.body, req.get('x-hub-signature-256'));
        // Never echo customer messages, external IDs, or raw payloads to the HTTP caller.
        const body = result.body;
        return res.status(result.statusCode).json('received' in body ? {
          received: body.received, processed: body.processed, duplicate: body.duplicate,
          eventsCount: body.eventsCount,
        } : { error: body.error });
      } catch {
        return res.status(503).json({ error: 'messaging_temporarily_unavailable' });
      }
    });
  return router;
}
