// @vitest-environment node
import { Writable } from 'node:stream';
import pino from 'pino';
import pinoHttp from 'pino-http';
import express from 'express';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const probe = vi.hoisted(() => ({
  execute: vi.fn(async (_signal: AbortSignal) => ({ error: null as null | { message: string } })),
  limit: vi.fn(),
  select: vi.fn(),
  from: vi.fn()
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: probe.from }) }));
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;
let loggingOptions: typeof import('../../server').productionLoggingOptions;
let httpLogProps: typeof import('../../server').productionHttpLogProps;

beforeAll(async () => {
  for (const [key, value] of Object.entries({ NODE_ENV: 'test', LOG_LEVEL: 'silent', JWT_SECRET: 'ccp30-test-only', SUPABASE_URL: 'https://database.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-placeholder', SUPABASE_ANON_KEY: '', STRIPE_SECRET_KEY: 'sk_test_fixture', RESEND_API_KEY: 're_fixture', STRIPE_WEBHOOK_SECRET: 'fixture-webhook', RESEND_WEBHOOK_SECRET: 'fixture-resend', EMAIL_FROM: 'fixture@example.invalid', ADMIN_EMAIL: 'fixture@example.invalid', VITE_APP_URL: 'https://app.invalid', VITE_API_URL: 'https://api.invalid', SENTRY_DSN: '', VITE_SENTRY_DSN: '', ABANDONED_CART_RECOVERY_DISABLED: 'true' })) vi.stubEnv(key, value);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('External network forbidden in CCP-30 tests'); }));
  const server = await import('../../server');
  loggingOptions = server.productionLoggingOptions;
  httpLogProps = server.productionHttpLogProps;
  app = await server.startServer({ listen: false });
}, 30000);
beforeEach(() => {
  probe.execute.mockReset().mockResolvedValue({ error: null });
  probe.limit.mockReset().mockReturnValue({ abortSignal: probe.execute });
  probe.select.mockReset().mockReturnValue({ limit: probe.limit });
  probe.from.mockReset().mockReturnValue({ select: probe.select });
});
afterAll(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('CCP-30 liveness and readiness', () => {
  it('health is shallow liveness and preserves operational fields', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', service: 'selfcare-sinners-web', environment: 'test' });
    expect(response.body.version).toBeTruthy();
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
    expect(probe.from).not.toHaveBeenCalled();
  });
  it('readiness checks DB read-only and existing provider configuration', async () => {
    const response = await request(app).get('/api/readiness');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
    expect(response.body.checks.supabase.ok).toBe(true);
    expect(response.body.requestId).toBe(response.headers['x-request-id']);
    expect(probe.from).toHaveBeenCalledWith('stores');
    expect(probe.select).toHaveBeenCalledWith('id');
    expect(probe.limit).toHaveBeenCalledWith(1);
    expect(probe.execute).toHaveBeenCalledWith(expect.any(AbortSignal));
  });
  it.each(['query error', 'exception'])('DB %s degrades readiness but not liveness', async (kind) => {
    if (kind === 'query error') probe.execute.mockResolvedValueOnce({ error: { message: 'private database diagnostic' } });
    else probe.execute.mockRejectedValueOnce(new Error('private database diagnostic'));
    const response = await request(app).get('/api/readiness');
    expect(response.status).toBe(503);
    expect(response.body.checks.supabase.ok).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain('private');
    expect(response.body).not.toHaveProperty('stack');
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
  it('bounds a stalled DB probe to 2000 ms and aborts it', async () => {
    let signal!: AbortSignal;
    let started!: () => void;
    const probing = new Promise<void>(resolve => { started = resolve; });
    probe.execute.mockImplementationOnce((value) => {
      signal = value;
      started();
      return new Promise(() => {});
    });
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      const responsePromise = request(app).get('/api/readiness').then(response => response);
      await probing;
      await vi.advanceTimersByTimeAsync(1999);
      expect(signal.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      const response = await responsePromise;
      expect(signal.aborted).toBe(true);
      expect(response.status).toBe(503);
      expect(response.body.checks.supabase).toMatchObject({ ok: false, error: 'Supabase check failed' });
      expect((await request(app).get('/api/health')).status).toBe(200);
    } finally { vi.useRealTimers(); }
  });
  it('missing DB configuration affects readiness only', async () => {
    vi.stubEnv('SUPABASE_URL', '');
    vi.resetModules();
    try {
      const unavailable = await (await import('../../server')).startServer({ listen: false });
      expect((await request(unavailable).get('/api/health')).status).toBe(200);
      const response = await request(unavailable).get('/api/readiness');
      expect(response.status).toBe(503);
      expect(response.body.checks.supabase.ok).toBe(false);
    } finally { vi.stubEnv('SUPABASE_URL', 'https://database.invalid'); }
  });
  it('production error responses never expose stack frames', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      const response = await request(app).post('/api/log-error').set('Content-Type', 'application/json').send('{');
      expect(response.status).toBe(400);
      expect(response.body.error).toMatch(/JSON|property/i);
      expect(response.body).not.toHaveProperty('stack');
      expect(response.body.error).not.toMatch(/\n\s+at /);
    } finally { vi.stubEnv('NODE_ENV', 'test'); }
  });
});

describe('CCP-30 production Pino logging configuration', () => {
  it('redacts credentials, request data, customer PII and card data while retaining stack frames', () => {
    let output = '';
    const destination = new Writable({ write(chunk, _encoding, callback) { output += chunk.toString(); callback(); } });
    const logger = pino({ ...loggingOptions(), level: 'error' }, destination);
    const sensitive = 'synthetic-sensitive-marker';
    const err = Object.assign(new Error('Database connection failed: ' + sensitive), { token: sensitive, customerEmail: sensitive, cause: new Error(sensitive), code: 'DB_UNAVAILABLE', status: 503 });
    logger.error({
      requestId: 'ccp30-correlation', status: 503, code: 'DB_UNAVAILABLE', path: '/api/readiness',
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
    expect(record).toMatchObject({ requestId: 'ccp30-correlation', status: 503, code: 'DB_UNAVAILABLE', path: '/api/readiness' });
    expect(record.err).toMatchObject({ code: 'DB_UNAVAILABLE', status: 503 });
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
    harness.use(pinoHttp({ logger, serializers: loggingOptions().serializers, customProps: (req) => httpLogProps(Object.assign(req, { requestId: 'ccp30-http-correlation' })) }));
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
    const record = JSON.parse(output.trim());
    expect(record.requestId).toBe('ccp30-http-correlation');
    expect(record.res.statusCode).toBe(200);
    expect(record.path).toBe('/test/:id');
    expect(record.req.url).toBe('[REDACTED]');
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
