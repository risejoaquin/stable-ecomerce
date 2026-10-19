// @vitest-environment node
import { describe, expect, it, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import {
  verifyMetaSignature,
  verifyMetaWebhookChallenge,
  timingSafeStringEqual,
} from '../../../src/services/meta-commerce/webhook-verifier';
import {
  normalizeMetaWebhookPayload,
  generateDeterministicEventId,
  generateConversationId,
  hashString,
  MalformedWebhookPayloadError,
} from '../../../src/services/meta-commerce/webhook-normalizer';
import {
  InMemoryWebhookIdempotencyStore,
  WebhookIdempotencyManager,
} from '../../../src/services/meta-commerce/webhook-idempotency';
import {
  sanitizeLogData,
  maskSensitiveValue,
  maskExternalUserId,
} from '../../../src/services/meta-commerce/webhook-sanitizer';
import {
  MetaWebhookIngestionService,
  MetaLiveInteractionProhibitedError,
} from '../../../src/services/meta-commerce/webhook-ingestion';
import {
  ConversationService,
  InMemoryConversationRepository,
} from '../../../src/services/meta-commerce';
import {
  textDmFixture,
  storyReplyFixture,
  commentFixture,
  duplicateEventFixture,
  malformedPayloadFixture,
  createSignedMetaPayload,
} from '../../../src/services/meta-commerce/fixtures';

describe('Meta Webhook Ingestion Unit Tests', () => {
  const testSecret = 'sec_relic_meta_test_secret_key_12345';
  const testVerifyToken = 'token_meta_relic_verify_99999';

  describe('1. Webhook Signature Verification (HMAC-SHA256)', () => {
    it('verifies a valid HMAC-SHA256 signature', () => {
      const payload = JSON.stringify(textDmFixture);
      const hmac = crypto.createHmac('sha256', testSecret).update(payload).digest('hex');
      const header = `sha256=${hmac}`;

      const result = verifyMetaSignature(payload, header, testSecret);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('verifies a valid signature when rawPayload is a Buffer', () => {
      const payloadBuf = Buffer.from(JSON.stringify(storyReplyFixture), 'utf8');
      const hmac = crypto.createHmac('sha256', testSecret).update(payloadBuf).digest('hex');
      const header = `sha256=${hmac}`;

      const result = verifyMetaSignature(payloadBuf, header, testSecret);
      expect(result.valid).toBe(true);
    });

    it('rejects verification if appSecret is missing or empty', () => {
      const payload = JSON.stringify(textDmFixture);
      const result = verifyMetaSignature(payload, 'sha256=1234', '');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('app_secret_missing');
    });

    it('rejects verification if signature header is missing or empty', () => {
      const payload = JSON.stringify(textDmFixture);
      const result = verifyMetaSignature(payload, undefined, testSecret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('missing_signature_header');
    });

    it('rejects verification if signature header is malformed (no equals sign)', () => {
      const payload = JSON.stringify(textDmFixture);
      const result = verifyMetaSignature(payload, 'sha256invalidhashformat', testSecret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('malformed_signature_header');
    });

    it('rejects verification if algorithm is not sha256 (e.g. sha1)', () => {
      const payload = JSON.stringify(textDmFixture);
      const hmac = crypto.createHmac('sha1', testSecret).update(payload).digest('hex');
      const result = verifyMetaSignature(payload, `sha1=${hmac}`, testSecret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('unsupported_algorithm_sha1');
    });

    it('rejects verification if signature hash is not 64 hex chars', () => {
      const payload = JSON.stringify(textDmFixture);
      const result = verifyMetaSignature(payload, 'sha256=tooshort', testSecret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('malformed_signature_hash');
    });

    it('rejects verification if signature does not match (forged signature)', () => {
      const payload = JSON.stringify(textDmFixture);
      const forgedHash = 'a'.repeat(64);
      const result = verifyMetaSignature(payload, `sha256=${forgedHash}`, testSecret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('signature_mismatch');
    });

    it('rejects verification if signed with a different secret', () => {
      const payload = JSON.stringify(textDmFixture);
      const hmac = crypto.createHmac('sha256', 'wrong_secret_abcdef').update(payload).digest('hex');
      const result = verifyMetaSignature(payload, `sha256=${hmac}`, testSecret);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('signature_mismatch');
    });

    it('timingSafeStringEqual returns false on length mismatch and true on equality', () => {
      expect(timingSafeStringEqual('abc', 'abcd')).toBe(false);
      expect(timingSafeStringEqual('my_secret', 'my_secret')).toBe(true);
      expect(timingSafeStringEqual('my_secret', 'other_sec')).toBe(false);
    });
  });

  describe('2. Webhook Challenge Handshake (GET /hub.mode=subscribe)', () => {
    it('approves valid challenge and echoes hub.challenge', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': testVerifyToken,
        'hub.challenge': '1158201244',
      };
      const result = verifyMetaWebhookChallenge(query, testVerifyToken);
      expect(result.valid).toBe(true);
      expect(result.challenge).toBe('1158201244');
    });

    it('rejects handshake if verifyToken is not configured', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': testVerifyToken,
        'hub.challenge': '1158201244',
      };
      const result = verifyMetaWebhookChallenge(query, '');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('verify_token_not_configured');
    });

    it('rejects handshake if hub.mode is not subscribe', () => {
      const query = {
        'hub.mode': 'publish',
        'hub.verify_token': testVerifyToken,
        'hub.challenge': '1158201244',
      };
      const result = verifyMetaWebhookChallenge(query, testVerifyToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('invalid_hub_mode');
    });

    it('rejects handshake if hub.verify_token does not match', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': '1158201244',
      };
      const result = verifyMetaWebhookChallenge(query, testVerifyToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('verify_token_mismatch');
    });

    it('rejects handshake if hub.challenge is missing', () => {
      const query = {
        'hub.mode': 'subscribe',
        'hub.verify_token': testVerifyToken,
      };
      const result = verifyMetaWebhookChallenge(query, testVerifyToken);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('missing_hub_challenge');
    });
  });

  describe('3. Event Normalization & Deterministic IDs', () => {
    it('normalizes Text DM fixture into canonical NormalizedMetaWebhookEvent', () => {
      const events = normalizeMetaWebhookPayload(textDmFixture);
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.channel).toBe('instagram');
      expect(event.eventType).toBe('message');
      expect(event.externalUserId).toBe('igsid_customer_001');
      expect(event.recipientId).toBe('ig_business_relic_001');
      expect(event.conversationId).toBe('instagram:ig_business_relic_001:igsid_customer_001');
      expect(event.messageId).toBe('m_mid.dm.text.fixture.001');
      expect(event.text).toBe('Hola, tienen disponibles hoodies en color negro?');
      expect(event.metadata.isStoryReply).toBe(false);
      expect(event.metadata.simulationMode).toBe(true);

      // Domain event for conversation state machine
      expect(event.domainEvent).toEqual({
        type: 'INBOUND_MESSAGE_RECEIVED',
        messageId: 'm_mid.dm.text.fixture.001',
        text: 'Hola, tienen disponibles hoodies en color negro?',
        timestamp: event.timestamp,
      });

      expect(event.eventId).toMatch(/^meta_evt_msg_[a-f0-9]{24}$/);
    });

    it('normalizes Story Reply fixture with story reference metadata', () => {
      const events = normalizeMetaWebhookPayload(storyReplyFixture);
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.channel).toBe('instagram');
      expect(event.eventType).toBe('story_reply');
      expect(event.externalUserId).toBe('igsid_customer_002');
      expect(event.recipientId).toBe('ig_business_relic_001');
      expect(event.metadata.isStoryReply).toBe(true);
      expect(event.metadata.storyId).toBe('story_media_relic_999');
      expect(event.metadata.storyUrl).toBe('https://instagram.com/stories/blackrelic/17900000000000000');
      expect(event.eventId).toMatch(/^meta_evt_sty_[a-f0-9]{24}$/);
    });

    it('normalizes Comment fixture under entry.changes', () => {
      const events = normalizeMetaWebhookPayload(commentFixture);
      expect(events).toHaveLength(1);

      const event = events[0];
      expect(event.channel).toBe('instagram');
      expect(event.eventType).toBe('comment');
      expect(event.externalUserId).toBe('igsid_customer_003');
      expect(event.recipientId).toBe('ig_business_relic_001');
      expect(event.messageId).toBe('comment_fixture_003');
      expect(event.text).toBe('Cuánto cuesta con envío a Monterrey?');
      expect(event.metadata.fromUsername).toBe('aesthetic_buyer');
      expect(event.metadata.postId).toBe('post_blackrelic_drop01');
      expect(event.eventId).toMatch(/^meta_evt_cmt_[a-f0-9]{24}$/);
    });

    it('generates identical deterministic event IDs for identical events', () => {
      const id1 = generateDeterministicEventId({
        channel: 'instagram',
        eventType: 'message',
        recipientId: 'ig_biz_1',
        externalUserId: 'ig_user_1',
        messageId: 'mid.123',
      });
      const id2 = generateDeterministicEventId({
        channel: 'instagram',
        eventType: 'message',
        recipientId: 'ig_biz_1',
        externalUserId: 'ig_user_1',
        messageId: 'mid.123',
      });
      expect(id1).toBe(id2);
    });

    it('generates distinct deterministic event IDs for different messages or recipients', () => {
      const id1 = generateDeterministicEventId({
        channel: 'instagram',
        eventType: 'message',
        recipientId: 'ig_biz_1',
        externalUserId: 'ig_user_1',
        messageId: 'mid.123',
      });
      const id2 = generateDeterministicEventId({
        channel: 'instagram',
        eventType: 'message',
        recipientId: 'ig_biz_1',
        externalUserId: 'ig_user_1',
        messageId: 'mid.456',
      });
      expect(id1).not.toBe(id2);
    });

    it('generates canonical conversation ID format', () => {
      const convId = generateConversationId('instagram', 'biz_99', 'user_77');
      expect(convId).toBe('instagram:biz_99:user_77');
    });

    it('throws MalformedWebhookPayloadError on invalid payload schema', () => {
      expect(() => {
        normalizeMetaWebhookPayload(malformedPayloadFixture);
      }).toThrow(MalformedWebhookPayloadError);
    });

    it('throws MalformedWebhookPayloadError on non-object or null payload', () => {
      expect(() => normalizeMetaWebhookPayload(null)).toThrow(MalformedWebhookPayloadError);
      expect(() => normalizeMetaWebhookPayload('string_payload')).toThrow(MalformedWebhookPayloadError);
      expect(() => normalizeMetaWebhookPayload({})).toThrow(MalformedWebhookPayloadError);
    });
  });

  describe('4. Idempotency & Replay Protection', () => {
    let idempotencyManager: WebhookIdempotencyManager;
    let store: InMemoryWebhookIdempotencyStore;

    beforeEach(() => {
      store = new InMemoryWebhookIdempotencyStore(1); // 1 hour TTL
      idempotencyManager = new WebhookIdempotencyManager(store);
    });

    it('marks new event as non-duplicate and subsequent replay as duplicate', async () => {
      const eventId = 'meta_evt_msg_test_idempotency_001';
      const payloadHash = hashString('test_payload_1');

      // First delivery
      const firstCheck = await idempotencyManager.checkAndMark(eventId, payloadHash, 'instagram');
      expect(firstCheck.duplicate).toBe(false);

      // Second delivery (replay)
      const secondCheck = await idempotencyManager.checkAndMark(eventId, payloadHash, 'instagram');
      expect(secondCheck.duplicate).toBe(true);
      expect(secondCheck.existingRecord?.eventId).toBe(eventId);
      expect(secondCheck.existingRecord?.rawPayloadHash).toBe(payloadHash);
    });

    it('correctly tracks multiple distinct event IDs', async () => {
      await idempotencyManager.checkAndMark('evt_1', 'hash_1');
      await idempotencyManager.checkAndMark('evt_2', 'hash_2');
      await idempotencyManager.checkAndMark('evt_3', 'hash_3');

      expect(store.size()).toBe(3);
      expect(await store.isProcessed('evt_1')).toBe(true);
      expect(await store.isProcessed('evt_2')).toBe(true);
      expect(await store.isProcessed('evt_3')).toBe(true);
      expect(await store.isProcessed('evt_4')).toBe(false);
    });

    it('clears idempotency store on request', async () => {
      await idempotencyManager.checkAndMark('evt_1', 'hash_1');
      expect(store.size()).toBe(1);

      await idempotencyManager.clear();
      expect(store.size()).toBe(0);
      expect(await store.isProcessed('evt_1')).toBe(false);
    });
  });

  describe('5. Sanitized Logs & PII Protection', () => {
    it('masks sensitive keys in object hierarchies', () => {
      const sensitiveData = {
        meta_app_secret: 'sec_1234567890abcdef',
        meta_verify_token: 'secret_token_123',
        'x-hub-signature-256': 'sha256=1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        externalUserId: '17841400012345678',
        safeKey: 'normal_text_value',
      };

      const sanitized = sanitizeLogData(sensitiveData) as Record<string, unknown>;
      expect(sanitized.meta_app_secret).toBe('[REDACTED]');
      expect(sanitized.meta_verify_token).toBe('[REDACTED]');
      expect(sanitized['x-hub-signature-256']).toBe('[REDACTED]');
      expect(sanitized.externalUserId).toBe('17****78');
      expect(sanitized.safeKey).toBe('normal_text_value');
    });

    it('redacts inline bearer tokens and signatures in strings', () => {
      const logString = 'Header was Bearer my_jwt_token_123 and sha256=abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
      const sanitized = sanitizeLogData(logString);
      expect(sanitized).toContain('Bearer [REDACTED]');
      expect(sanitized).toContain('sha256=[REDACTED]');
    });

    it('maskSensitiveValue redacts short and long tokens appropriately', () => {
      expect(maskSensitiveValue('short')).toBe('[REDACTED]');
      expect(maskSensitiveValue('longer_secret_key_12345')).toBe('lon...345[REDACTED]');
    });

    it('maskExternalUserId protects user IDs', () => {
      expect(maskExternalUserId('12')).toBe('***');
      expect(maskExternalUserId('1234567890')).toBe('12****90');
    });
  });

  describe('6. MetaWebhookIngestionService Full Ingestion Flow', () => {
    let service: MetaWebhookIngestionService;
    let repo: InMemoryConversationRepository;
    let convService: ConversationService;
    let idempManager: WebhookIdempotencyManager;

    beforeEach(() => {
      repo = new InMemoryConversationRepository();
      convService = new ConversationService(repo);
      idempManager = new WebhookIdempotencyManager(new InMemoryWebhookIdempotencyStore(24));

      service = new MetaWebhookIngestionService(
        {
          appSecret: testSecret,
          verifyToken: testVerifyToken,
          simulationMode: true,
        },
        {
          idempotencyManager: idempManager,
          conversationService: convService,
        },
      );
    });

    it('successfully ingests a signed Text DM and applies conversation event', async () => {
      const signed = createSignedMetaPayload(textDmFixture, testSecret);
      const response = await service.ingestPayload(signed.rawBuffer, signed.signatureHeader);

      expect(response.statusCode).toBe(200);
      const body = response.body as any;
      expect(body.received).toBe(true);
      expect(body.processed).toBe(true);
      expect(body.duplicate).toBe(false);
      expect(body.eventsCount).toBe(1);
      expect(body.simulationMode).toBe(true);

      // Verify conversation state was initialized and updated in repository
      const convId = 'instagram:ig_business_relic_001:igsid_customer_001';
      const convState = await repo.findById(convId);
      expect(convState).not.toBeNull();
      expect(convState?.channel).toBe('instagram');
      expect(convState?.external_user_id).toBe('igsid_customer_001');
      expect(convState?.last_inbound_at).toBeDefined();
      expect(convState?.state_version).toBe(2); // Initial created (1) + inbound event reduced (2)
    });

    it('handles duplicate event replay without re-applying domain mutations', async () => {
      const signed = createSignedMetaPayload(duplicateEventFixture, testSecret);

      // 1st delivery
      const firstRes = await service.ingestPayload(signed.rawBuffer, signed.signatureHeader);
      expect(firstRes.statusCode).toBe(200);
      expect((firstRes.body as any).duplicate).toBe(false);

      const convId = 'instagram:ig_business_relic_001:igsid_customer_001';
      const stateAfterFirst = await repo.findById(convId);
      expect(stateAfterFirst?.state_version).toBe(2);

      // 2nd delivery (Replay of identical payload)
      const secondRes = await service.ingestPayload(signed.rawBuffer, signed.signatureHeader);
      expect(secondRes.statusCode).toBe(200);
      const secondBody = secondRes.body as any;
      expect(secondBody.received).toBe(true);
      expect(secondBody.duplicate).toBe(true);

      // State version MUST remain unchanged (idempotency guarantee)
      const stateAfterSecond = await repo.findById(convId);
      expect(stateAfterSecond?.state_version).toBe(2);
    });

    it('rejects unsigned payloads with 401 Unauthorized', async () => {
      const payload = JSON.stringify(textDmFixture);
      const response = await service.ingestPayload(payload, undefined);

      expect(response.statusCode).toBe(401);
      expect((response.body as any).error).toBe('invalid_webhook_signature');
    });

    it('rejects forged signature with 401 Unauthorized', async () => {
      const payload = JSON.stringify(textDmFixture);
      const forgedSig = 'sha256=' + '0'.repeat(64);
      const response = await service.ingestPayload(payload, forgedSig);

      expect(response.statusCode).toBe(401);
      expect((response.body as any).error).toBe('invalid_webhook_signature');
      expect((response.body as any).reason).toBe('signature_mismatch');
    });

    it('rejects malformed non-JSON payload with 400 Bad Request', async () => {
      const badString = 'not_a_valid_json_string{{{';
      const signed = createSignedMetaPayload(badString, testSecret);
      const response = await service.ingestPayload(signed.rawBuffer, signed.signatureHeader);

      expect(response.statusCode).toBe(400);
      expect((response.body as any).error).toBe('malformed_payload');
    });

    it('rejects malformed schema payload with 400 Bad Request and validation details', async () => {
      const signed = createSignedMetaPayload(malformedPayloadFixture, testSecret);
      const response = await service.ingestPayload(signed.rawBuffer, signed.signatureHeader);

      expect(response.statusCode).toBe(400);
      expect((response.body as any).error).toBe('malformed_payload');
      expect((response.body as any).validationErrors).toBeDefined();
    });

    it('enforces simulation invariant and prohibits disabling simulation', () => {
      const liveService = new MetaWebhookIngestionService({
        appSecret: testSecret,
        simulationMode: false,
      });

      expect(() => {
        liveService.assertSimulationInvariant();
      }).toThrow(MetaLiveInteractionProhibitedError);
    });
  });
});
