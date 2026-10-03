// @vitest-environment node
import { Writable } from 'node:stream';
import pino from 'pino';
import pinoHttp from 'pino-http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const probe = vi.hoisted(() => ({
  limit: vi.fn(async () => ({ error: null as null | { message: string } })),
  select: vi.fn(),
  from: vi.fn()
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: probe.from }) }));
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;
let loggingOptions: typeof import('../../server').productionLoggingOptions;

beforeAll(async () => {
  for (const [key, value] of Object.entries({ NODE_ENV: 'test', LOG_LEVEL: 'silent', JWT_SECRET: 'ccp30-test-only', SUPABASE_URL: 'https://database.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-placeholder', SUPABASE_ANON_KEY: '', STRIPE_SECRET_KEY: '', RESEND_API_KEY: '', SENTRY_DSN: '', VITE_SENTRY_DSN: '', ABANDONED_CART_RECOVERY_DISABLED: 'true' })) vi.stubEnv(key, value);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('External network forbidden in CCP-30 tests'); }));
  const server = await import('../../server');
  loggingOptions = server.productionLoggingOptions;
  app = await server.startServer({ listen: false });
}, 30000);
beforeEach(() => {
  probe.limit.mockReset().mockResolvedValue({ error: null });
  probe.select.mockReset().mockReturnValue({ limit: probe.limit });
  probe.from.mockReset().mockReturnValue({ select: probe.select });
});
afterAll(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('CCP-30 existing GET /api/health', () => {
  it('queries DB read-only and preserves health fields when connected', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', database: 'connected', service: 'selfcare-sinners-web', environment: 'test' });
    expect(response.body.version).toBeTruthy();
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
    expect(probe.from).toHaveBeenCalledWith('stores');
    expect(probe.select).toHaveBeenCalledWith('id', { head: true });
    expect(probe.limit).toHaveBeenCalledWith(1);
  });
  it('returns 503 for query errors without exposing the error', async () => {
    probe.limit.mockResolvedValueOnce({ error: { message: 'private database diagnostic' } });
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({ status: 'degraded', database: 'disconnected' });
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(response.body).not.toHaveProperty('stack');
  });
  it('returns 503 for thrown exceptions instead of generic 500', async () => {
    probe.limit.mockRejectedValueOnce(new Error('synthetic private exception'));
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(503);
    expect(response.body.database).toBe('disconnected');
    expect(JSON.stringify(response.body)).not.toContain('synthetic private');
    expect(response.body).not.toHaveProperty('stack');
  });
  it('returns 503 when Supabase is not configured', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.resetModules();
    try {
      const unavailable = await (await import('../../server')).startServer({ listen: false });
      expect((await request(unavailable).get('/api/health')).status).toBe(503);
    } finally { vi.stubEnv('SUPABASE_URL', 'https://database.invalid'); }
  });
});

describe('CCP-30 production Pino logging configuration', () => {
  it('redacts credentials, request data, customer PII and card data while retaining stack frames', () => {
    let output = '';
    const destination = new Writable({ write(chunk, _encoding, callback) { output += chunk.toString(); callback(); } });
    const logger = pino({ ...loggingOptions(), level: 'error' }, destination);
    const sensitive = 'synthetic-sensitive-marker';
    const err = Object.assign(new Error('Database connection failed: ' + sensitive), { token: sensitive, customerEmail: sensitive, cause: new Error(sensitive) });
    logger.error({
      err, password: sensitive, token: sensitive, secret: sensitive, jwt: sensitive,
      STRIPE_SECRET_KEY: sensitive, SUPABASE_SERVICE_ROLE_KEY: sensitive,
      req: { headers: { authorization: sensitive, cookie: sensitive }, url: '/path?token=' + sensitive, remoteAddress: sensitive, body: { email: sensitive } },
      res: { headers: { 'set-cookie': sensitive } },
      customer: { email: sensitive, phone: sensitive, fullName: sensitive, address: sensitive },
      payment: { tenderDetails: { cardNumber: sensitive, pan: sensitive, cvv: sensitive } },
      credentials: { stripeSecretKey: sensitive, webhookSecret: sensitive, supabaseServiceRoleKey: sensitive },
      metadata: { arbitrary: sensitive }
    }, 'Unhandled Error');
    expect(output).not.toContain(sensitive);
    const record = JSON.parse(output);
    expect(record.msg).toBe('Unhandled Error');
    expect(record.err.type).toBe('Error');
    expect(record.err.message).toBe('Database connection failed: [REDACTED]: [REDACTED]');
    expect(record.err.stack).toContain('at ');
    expect(record.err.stack).toContain('health.test.ts');
    expect(record.req.headers).toBe('[REDACTED]');
    expect(record.payment.tenderDetails).toBe('[REDACTED]');
    expect(record.customer.email).toBe('[REDACTED]');
    expect(record.err).not.toHaveProperty('cause');
  });
  it('keeps the real request intact while pino-http logs redact detached metadata', async () => {
    let output = '';
    const logger = pino({ ...loggingOptions(), level: 'info' }, new Writable({ write(chunk, _encoding, callback) { output += chunk.toString(); callback(); } }));
    const harness = express();
    harness.use(express.json());
    harness.use(pinoHttp({ logger, serializers: { req: loggingOptions().serializers!.req } }));
    harness.post('/test/:id', (req, res) => {
      expect(req.headers.authorization).toBe('Bearer synthetic-auth-marker');
      expect(req.headers.cookie).toBe('session=synthetic-cookie-marker');
      expect(req.body).toEqual({ password: 'synthetic-password-marker' });
      expect(req.query).toEqual({ token: 'synthetic-query-marker' });
      expect(req.params).toEqual({ id: 'test' });
      res.json({ ok: true });
    });
    const response = await request(harness).post('/test/test?token=synthetic-query-marker')
      .set('Authorization', 'Bearer synthetic-auth-marker').set('Cookie', 'session=synthetic-cookie-marker')
      .send({ password: 'synthetic-password-marker' });
    expect(response.status).toBe(200);
    for (const marker of ['synthetic-auth-marker', 'synthetic-cookie-marker', 'synthetic-password-marker', 'synthetic-query-marker']) expect(output).not.toContain(marker);
    expect(output).toContain('[REDACTED]');
  });
  it('sanitizes embedded credentials and PII without discarding error diagnostics', () => {
    let output = '';
    const logger = pino({ ...loggingOptions(), level: 'error' }, new Writable({ write(chunk, _encoding, callback) { output += chunk.toString(); callback(); } }));
    logger.error({ err: new Error('Upstream rejected email=customer@example.invalid phone=5551234567 token=private-token cvv=123 Bearer private-session sk_live_fakekey') }, 'Upstream failure');
    const record = JSON.parse(output);
    expect(record.err.message).toContain('Upstream rejected');
    expect(record.err.stack).toContain('at ');
    for (const value of ['customer@example.invalid', '5551234567', 'private-token', 'private-session', 'sk_live_fakekey', 'cvv=123']) expect(output).not.toContain(value);
  });

});
