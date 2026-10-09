// @vitest-environment node
import { createHmac } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { processEvent } = vi.hoisted(() => ({ processEvent: vi.fn() }));
vi.mock('../../src/server/email/email-webhooks.js', () => ({
  processResendWebhookEvent: processEvent,
}));

// Synthetic fixture key only. Verification uses the real Resend/Svix SDK locally.
const fixtureKey = Buffer.from('ccp17-local-signature-fixture-only');
const payload = JSON.stringify({
  type: 'email.delivered',
  data: { email_id: 'ccp17-fixture-message', to: ['fixture@example.invalid'] },
});
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LOG_LEVEL', 'silent');
  vi.stubEnv('JWT_SECRET', 'ccp17-local-jwt-fixture-only');
  vi.stubEnv('RESEND_API_KEY', 're_ccp17_fixture_only');
  vi.stubEnv('RESEND_WEBHOOK_SECRET', `whsec_${fixtureKey.toString('base64')}`);
  vi.stubEnv('SUPABASE_URL', '');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
  vi.stubEnv('SUPABASE_ANON_KEY', '');
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_ccp17_fixture_only');
  vi.stubEnv('SENTRY_DSN', '');
  vi.stubEnv('VITE_SENTRY_DSN', '');
  vi.stubEnv('ABANDONED_CART_RECOVERY_DISABLED', 'true');
  // No external traffic is permitted, including accidental SDK calls.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('External requests prohibited in CCP-17 test')));
  const server = await import('../../server');
  app = await server.startServer({ listen: false });
}, 30000);

beforeEach(() => {
  processEvent.mockReset();
  processEvent.mockResolvedValue({ processed: true });
});

afterAll(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('CCP-17: real Resend webhook signature enforcement', () => {
  it('missing Svix headers -> HTTP 401 without processing', async () => {
    const response = await request(app)
      .post('/api/webhooks/resend')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(processEvent).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it('forged signature -> HTTP 401 without processing', async () => {
    const response = await request(app)
      .post('/api/webhooks/resend')
      .set('Content-Type', 'application/json')
      .set('svix-id', 'msg_ccp17_fixture')
      .set('svix-timestamp', String(Math.floor(Date.now() / 1000)))
      .set('svix-signature', `v1,${Buffer.alloc(32).toString('base64')}`)
      .send(payload);

    expect(processEvent).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
  });

  it.each(['svix-id', 'svix-timestamp', 'svix-signature'])('partial headers missing %s -> HTTP 401', async (missing) => {
    const headers = {
      'svix-id': 'msg_ccp17_fixture',
      'svix-timestamp': String(Math.floor(Date.now() / 1000)),
      'svix-signature': 'v1,fixture',
    };
    delete headers[missing as keyof typeof headers];
    const response = await request(app).post('/api/webhooks/resend')
      .set('Content-Type', 'application/json').set(headers).send(payload);
    expect(response.status).toBe(401);
    expect(processEvent).not.toHaveBeenCalled();
  });

  it.each([
    ['stale timestamp', payload, -3600, 401],
    ['future timestamp', payload, 3600, 401],
    ['empty payload', '', 0, 401],
    ['processor failure', payload, 0, 500],
  ] as const)('%s with authentic signature', async (scenario, body, offset, status) => {
    const id = 'msg_ccp17_fixture';
    const timestamp = String(Math.floor(Date.now() / 1000) + offset);
    const signature = createHmac('sha256', fixtureKey)
      .update(`${id}.${timestamp}.${body}`).digest('base64');
    if (scenario === 'processor failure') {
      processEvent.mockRejectedValueOnce(new Error('CCP-17 synthetic processing failure'));
    }
    const response = await request(app).post('/api/webhooks/resend')
      .set('Content-Type', 'application/json')
      .set('svix-id', id).set('svix-timestamp', timestamp)
      .set('svix-signature', `v1,${signature}`).send(body);
    expect(response.status).toBe(status);
    if (scenario === 'processor failure') {
      expect(response.status).not.toBe(401);
      expect(processEvent).toHaveBeenCalledExactlyOnceWith({ supabase: null, event: JSON.parse(payload) });
      expect(response.body.error).toBe('Webhook processing failed');
    } else {
      expect(processEvent).not.toHaveBeenCalled();
    }
  });

  it('valid signature -> HTTP 200 and processing only after verification', async () => {
    const id = 'msg_ccp17_fixture';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac('sha256', fixtureKey)
      .update(`${id}.${timestamp}.${payload}`)
      .digest('base64');
    const response = await request(app)
      .post('/api/webhooks/resend')
      .set('Content-Type', 'application/json')
      .set('svix-id', id)
      .set('svix-timestamp', timestamp)
      .set('svix-signature', `v1,${signature}`)
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ received: true, processed: true });
    expect(processEvent).toHaveBeenCalledExactlyOnceWith({ supabase: null, event: JSON.parse(payload) });
    expect(fetch).not.toHaveBeenCalled();
  });
});
