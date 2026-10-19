// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import {
  textDmFixture,
  storyReplyFixture,
  commentFixture,
  duplicateEventFixture,
  malformedPayloadFixture,
  createSignedMetaPayload,
} from '../../src/services/meta-commerce/fixtures';
import { setSharedMetaWebhookService, MetaWebhookIngestionService } from '../../src/services/meta-commerce';

const FIXTURE_APP_SECRET = 'meta_test_app_secret_fixed_001';
const FIXTURE_VERIFY_TOKEN = 'meta_test_verify_token_fixed_001';

let app: Awaited<ReturnType<typeof import('../../server').startServer>>;

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LOG_LEVEL', 'silent');
  vi.stubEnv('JWT_SECRET', 'meta-test-jwt-secret');
  vi.stubEnv('META_APP_SECRET', FIXTURE_APP_SECRET);
  vi.stubEnv('META_WEBHOOK_VERIFY_TOKEN', FIXTURE_VERIFY_TOKEN);
  vi.stubEnv('SUPABASE_URL', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.stubEnv('SUPABASE_ANON_KEY', '');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_meta_test');
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_meta_test');
  vi.stubEnv('RESEND_API_KEY', 're_meta_test');
  vi.stubEnv('RESEND_WEBHOOK_SECRET', 'whsec_meta_resend');
  vi.stubEnv('ABANDONED_CART_RECOVERY_DISABLED', 'true');

  // Safety Invariant: Guarantee 0 external network requests are made during test execution
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Live outbound requests strictly prohibited in simulation mode')));

  // Initialize server instance
  const server = await import('../../server');
  app = await server.startServer({ listen: false });
}, 30000);

beforeEach(() => {
  // Reset shared service with fresh in-memory idempotency cache for each test
  setSharedMetaWebhookService(
    new MetaWebhookIngestionService({
      appSecret: FIXTURE_APP_SECRET,
      verifyToken: FIXTURE_VERIFY_TOKEN,
      simulationMode: true,
    }),
  );
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Meta Commerce Messaging Webhook API Endpoints', () => {
  describe('GET /api/webhooks/meta (Handshake Verification)', () => {
    it('returns 200 with raw challenge text on valid verification request', async () => {
      const response = await request(app)
        .get('/api/webhooks/meta')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': FIXTURE_VERIFY_TOKEN,
          'hub.challenge': '1158201244',
        });

      expect(response.status).toBe(200);
      expect(response.text).toBe('1158201244');
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('returns 403 on invalid verification token', async () => {
      const response = await request(app)
        .get('/api/webhooks/meta')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'wrong_token',
          'hub.challenge': '1158201244',
        });

      expect(response.status).toBe(403);
    });

    it('returns 403 on invalid hub.mode', async () => {
      const response = await request(app)
        .get('/api/webhooks/meta')
        .query({
          'hub.mode': 'invalid_mode',
          'hub.verify_token': FIXTURE_VERIFY_TOKEN,
          'hub.challenge': '1158201244',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/webhooks/meta (Event Ingestion & Security)', () => {
    it('successfully processes a valid signed Text DM event', async () => {
      const signed = createSignedMetaPayload(textDmFixture, FIXTURE_APP_SECRET);

      const response = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', signed.signatureHeader)
        .send(signed.jsonString);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        received: true,
        processed: true,
        duplicate: false,
        eventsCount: 1,
        simulationMode: true,
      });

      expect(response.body.events[0]).toMatchObject({
        channel: 'instagram',
        eventType: 'message',
        externalUserId: 'igsid_customer_001',
        recipientId: 'ig_business_relic_001',
        text: 'Hola, tienen disponibles hoodies en color negro?',
      });

      // Assert zero outbound network calls occurred
      expect(fetch).not.toHaveBeenCalled();
    });

    it('successfully processes a valid signed Story Reply event', async () => {
      const signed = createSignedMetaPayload(storyReplyFixture, FIXTURE_APP_SECRET);

      const response = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', signed.signatureHeader)
        .send(signed.jsonString);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        received: true,
        processed: true,
        duplicate: false,
        eventsCount: 1,
      });

      expect(response.body.events[0]).toMatchObject({
        channel: 'instagram',
        eventType: 'story_reply',
        externalUserId: 'igsid_customer_002',
        metadata: {
          isStoryReply: true,
          storyId: 'story_media_relic_999',
        },
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('successfully processes a valid signed Comment event', async () => {
      const signed = createSignedMetaPayload(commentFixture, FIXTURE_APP_SECRET);

      const response = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', signed.signatureHeader)
        .send(signed.jsonString);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        received: true,
        processed: true,
        duplicate: false,
        eventsCount: 1,
      });

      expect(response.body.events[0]).toMatchObject({
        channel: 'instagram',
        eventType: 'comment',
        externalUserId: 'igsid_customer_003',
        text: 'Cuánto cuesta con envío a Monterrey?',
      });

      expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects unsigned payloads with HTTP 401', async () => {
      const response = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify(textDmFixture));

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'invalid_webhook_signature',
        reason: 'missing_signature_header',
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects forged signatures with HTTP 401', async () => {
      const forgedSig = 'sha256=' + 'f'.repeat(64);
      const response = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', forgedSig)
        .send(JSON.stringify(textDmFixture));

      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({
        error: 'invalid_webhook_signature',
        reason: 'signature_mismatch',
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects malformed signature header format with HTTP 401', async () => {
      const response = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', 'malformed_no_equals')
        .send(JSON.stringify(textDmFixture));

      expect(response.status).toBe(401);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects malformed JSON payload with HTTP 400', async () => {
      const badJson = 'invalid_json_payload{{{';
      const signed = createSignedMetaPayload(badJson, FIXTURE_APP_SECRET);

      const response = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', signed.signatureHeader)
        .send(badJson);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'malformed_payload',
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it('rejects malformed schema payload with HTTP 400 and validation details', async () => {
      const signed = createSignedMetaPayload(malformedPayloadFixture, FIXTURE_APP_SECRET);

      const response = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', signed.signatureHeader)
        .send(signed.jsonString);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({
        error: 'malformed_payload',
      });
      expect(response.body.validationErrors).toBeDefined();
      expect(fetch).not.toHaveBeenCalled();
    });

    it('handles duplicate event replay and returns duplicate: true without re-executing', async () => {
      const signed = createSignedMetaPayload(duplicateEventFixture, FIXTURE_APP_SECRET);

      // First request
      const firstResponse = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', signed.signatureHeader)
        .send(signed.jsonString);

      expect(firstResponse.status).toBe(200);
      expect(firstResponse.body.duplicate).toBe(false);

      // Second request (replay)
      const secondResponse = await request(app)
        .post('/api/webhooks/meta')
        .set('Content-Type', 'application/json')
        .set('x-hub-signature-256', signed.signatureHeader)
        .send(signed.jsonString);

      expect(secondResponse.status).toBe(200);
      expect(secondResponse.body.duplicate).toBe(true);
      expect(secondResponse.body.received).toBe(true);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});
