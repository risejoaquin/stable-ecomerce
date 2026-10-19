import { verifyMetaSignature, verifyMetaWebhookChallenge } from './webhook-verifier';
import {
  normalizeMetaWebhookPayload,
  MalformedWebhookPayloadError,
} from './webhook-normalizer';
import { WebhookIdempotencyManager } from './webhook-idempotency';
import { sanitizeLogData } from './webhook-sanitizer';
import type {
  NormalizedMetaWebhookEvent,
  WebhookIngestionResult,
} from './webhook-types';
import type { ConversationService } from './conversation-service';

export class MetaLiveInteractionProhibitedError extends Error {
  constructor(action: string) {
    super(`Live interaction with Meta Graph API is prohibited in simulation/dry-run mode: ${action}`);
    this.name = 'MetaLiveInteractionProhibitedError';
  }
}

export interface MetaWebhookIngestionConfig {
  appSecret?: string;
  verifyToken?: string;
  simulationMode?: boolean;
}

export interface IngestionResponse {
  statusCode: number;
  body:
    | WebhookIngestionResult
    | { error: string; message?: string; reason?: string; validationErrors?: unknown };
}

/**
 * Service coordinating Meta webhook verification, normalization, idempotency,
 * and conversation state transition in simulation/dry-run mode.
 */
export class MetaWebhookIngestionService {
  private readonly appSecret: string;
  private readonly verifyToken: string;
  private readonly simulationMode: boolean;
  private readonly idempotency: WebhookIdempotencyManager;
  private readonly conversationService?: ConversationService;
  private readonly processEvent?: (event: NormalizedMetaWebhookEvent) => Promise<void>;

  constructor(
    config: MetaWebhookIngestionConfig = {},
    dependencies: {
      idempotencyManager?: WebhookIdempotencyManager;
      conversationService?: ConversationService;
      processEvent?: (event: NormalizedMetaWebhookEvent) => Promise<void>;
    } = {},
  ) {
    this.appSecret = config.appSecret || process.env.META_APP_SECRET || process.env.META_WEBHOOK_SECRET || '';
    this.verifyToken = config.verifyToken || process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || '';
    // Safety Invariant: Simulation / Dry-Run only. Live external API calls are strictly forbidden.
    this.simulationMode = config.simulationMode !== undefined ? config.simulationMode : true;
    this.idempotency = dependencies.idempotencyManager || new WebhookIdempotencyManager();
    this.conversationService = dependencies.conversationService;
    this.processEvent = dependencies.processEvent;
  }

  /**
   * Handles GET webhook challenge verification from Meta Graph API.
   */
  handleVerificationHandshake(query: Record<string, unknown>): {
    statusCode: number;
    challenge?: string;
    error?: string;
  } {
    const result = verifyMetaWebhookChallenge(query, this.verifyToken);
    if (!result.valid) {
      return {
        statusCode: 403,
        error: result.reason || 'forbidden',
      };
    }
    return {
      statusCode: 200,
      challenge: result.challenge,
    };
  }

  /**
   * Asserts that no outbound live API calls are triggered.
   */
  assertSimulationInvariant(): void {
    if (!this.simulationMode) {
      throw new MetaLiveInteractionProhibitedError('Simulation mode must remain active.');
    }
  }

  /**
   * Ingests and processes inbound webhook payload.
   */
  async ingestPayload(
    rawBody: Buffer | string,
    signatureHeader?: string | null,
  ): Promise<IngestionResponse> {
    this.assertSimulationInvariant();

    // 1. Verify HMAC-SHA256 signature
    const verification = verifyMetaSignature(rawBody, signatureHeader, this.appSecret);
    if (!verification.valid) {
      return {
        statusCode: 401,
        body: {
          error: 'invalid_webhook_signature',
          reason: verification.reason,
        },
      };
    }

    // 2. Parse raw body into JSON
    let parsedPayload: unknown;
    try {
      const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
      parsedPayload = JSON.parse(bodyString);
    } catch (_parseErr) {
      return {
        statusCode: 400,
        body: {
          error: 'malformed_payload',
          message: 'Payload body is not valid JSON',
        },
      };
    }

    // 3. Normalize into canonical domain events
    let normalizedEvents: NormalizedMetaWebhookEvent[];
    try {
      normalizedEvents = normalizeMetaWebhookPayload(parsedPayload, {
        simulationMode: true,
      });
    } catch (normErr: any) {
      if (normErr instanceof MalformedWebhookPayloadError) {
        return {
          statusCode: 400,
          body: {
            error: 'malformed_payload',
            message: normErr.message,
            validationErrors: normErr.validationErrors,
          },
        };
      }
      return {
        statusCode: 400,
        body: {
          error: 'malformed_payload',
          message: normErr?.message || 'Failed to normalize payload',
        },
      };
    }

    // 4. Idempotency & Replay Handling
    let processedCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];
    const completedEvents: NormalizedMetaWebhookEvent[] = [];

    for (const event of normalizedEvents) {
      const claim = await this.idempotency.claim(event.eventId);

      if (claim === 'processed') {
        duplicateCount++;
        continue;
      }
      if (claim === 'busy') {
        errors.push(`Event ${event.eventId} is still processing; retry required`);
        continue;
      }

      processedCount++;

      // 5. Connect to Conversation Domain if ConversationService is configured
      try {
        if (this.conversationService) {
          await this.conversationService.getOrCreate(
            event.conversationId,
            event.externalUserId,
            event.channel,
            {
              lastMessageId: event.messageId,
              isStoryReply: event.metadata.isStoryReply,
              storyId: event.metadata.storyId,
              commentId: event.metadata.commentId,
              postId: event.metadata.postId,
            },
          );

          await this.conversationService.applyEvent(
            event.conversationId,
            event.domainEvent,
          );
        }
        if (this.processEvent) await this.processEvent(event);
        await this.idempotency.complete(event.eventId, event.metadata.rawPayloadHash, event.channel);
        completedEvents.push(event);
      } catch (_domainErr: unknown) {
        await this.idempotency.release(event.eventId);
        errors.push(`Conversation update error for event ${event.eventId}; retry required`);
      }
    }

    const isDuplicate = normalizedEvents.length > 0 && duplicateCount === normalizedEvents.length;

    const resultBody: WebhookIngestionResult = {
      received: true,
      processed: errors.length === 0,
      duplicate: isDuplicate,
      eventsCount: normalizedEvents.length,
      events: completedEvents,
      ...(errors.length > 0 ? { errors } : {}),
      simulationMode: true,
    };

    return {
      statusCode: errors.length > 0 ? 503 : 200,
      body: resultBody,
    };
  }

  /**
   * Helper to return sanitized log payload.
   */
  getSanitizedLog(data: unknown): unknown {
    return sanitizeLogData(data);
  }
}
