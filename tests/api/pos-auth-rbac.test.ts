// @vitest-environment node
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { requirePosOperator, verifyBearerAuth, type PosUser } from '../../src/server/middleware/auth';

const secret = 'ccp22-synthetic-test-secret';
const warn = vi.fn();
let profile: PosUser | null;
const findUser = vi.fn(async () => profile);
const token = (role = 'user', options: jwt.SignOptions = { expiresIn: '10m' }) => jwt.sign({ userId: 'test-user', role }, secret, options);
const harness = express();
harness.use('/api/pos', requirePosOperator({ authenticate: req => verifyBearerAuth(req, secret), findUser, logger: { warn } }));
// This endpoint exists exclusively in the test harness.
harness.post('/api/pos/test-only', (req: any, res) => res.json({ auth: req.auth, user: req.user }));
beforeEach(() => { profile = { id: 'test-user', email: 'test@example.invalid', role: 'user' }; findUser.mockClear(); warn.mockClear(); });

function checkError(response: request.Response, status: number, code: string) {
  expect(response.status).toBe(status);
  expect(response.body.error).toMatchObject({ code, details: {} });
  expect(response.body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  expect(response.headers['x-request-id']).toBe(response.body.error.requestId);
}
describe('CCP-22 reusable POS guard', () => {
  it('rejects anonymous before user lookup', async () => {
    const response = await request(harness).post('/api/pos/test-only');
    checkError(response, 401, 'AUTH_REQUIRED');
    expect(response.body.error.message).toBe('Authentication required to access Web POS endpoints.');
    expect(findUser).not.toHaveBeenCalled();
  });
  for (const role of ['user', 'support']) it(`denies ${role}, ignoring elevated token/body roles`, async () => {
    profile!.role = role;
    const response = await request(harness).post('/api/pos/test-only').set('Authorization', `Bearer ${token('admin')}`).send({ role: 'owner' });
    checkError(response, 403, 'FORBIDDEN');
    expect(response.body.error.message).toBe('Insufficient permissions. Web POS access is restricted to store administrators and owners.');
    expect(warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'pos_unauthorized_access', userId: 'test-user', role }), 'Forbidden Web POS access');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(token('admin'));
  });
  for (const role of ['admin', 'owner']) it(`allows authoritative ${role} and attaches context`, async () => {
    profile!.role = role;
    const response = await request(harness).post('/api/pos/test-only').set('Authorization', `Bearer ${token()}`);
    expect(response.status).toBe(200);
    expect(response.body.auth).toEqual({ userId: 'test-user', role });
    expect(response.body.user).toEqual(profile);
  });
  for (const [name, value] of [['tampered', token() + 'x'], ['expired', token('admin', { expiresIn: -1 })], ['malformed', 'not-a-token']]) it(`rejects ${name} token`, async () => {
    checkError(await request(harness).post('/api/pos/test-only').set('Authorization', `Bearer ${value}`), 401, 'AUTH_REQUIRED');
    expect(findUser).not.toHaveBeenCalled();
  });
  it('rejects a deleted profile', async () => {
    profile = null;
    checkError(await request(harness).post('/api/pos/test-only').set('Authorization', `Bearer ${token()}`), 403, 'FORBIDDEN');
  });
  it('fails closed and hides lookup errors', async () => {
    findUser.mockRejectedValueOnce(new Error('sensitive internal database message'));
    const response = await request(harness).post('/api/pos/test-only').set('Authorization', `Bearer ${token()}`);
    checkError(response, 500, 'INTERNAL_ERROR');
    expect(JSON.stringify(response.body)).not.toContain('sensitive');
  });
  it('preserves valid correlation UUID', async () => {
    const id = 'd947b988-b3cf-4c39-987e-377cbb7c623e';
    const response = await request(harness).post('/api/pos/test-only').set('X-Request-Id', id);
    expect(response.body.error.requestId).toBe(id);
  });
});

const db = vi.hoisted(() => ({ single: vi.fn(async () => ({ data: { id: 'test-user', email: 'test@example.invalid', role: 'admin' }, error: null })) }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ single: db.single }) }) }) }) }));
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;
beforeAll(async () => {
  for (const [key, value] of Object.entries({ NODE_ENV: 'test', LOG_LEVEL: 'silent', JWT_SECRET: secret, SUPABASE_URL: 'https://database.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-placeholder', STRIPE_SECRET_KEY: '', RESEND_API_KEY: '', SENTRY_DSN: '', VITE_SENTRY_DSN: '', ABANDONED_CART_RECOVERY_DISABLED: 'true' })) vi.stubEnv(key, value);
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('External network forbidden'); }));
  app = await (await import('../../server')).startServer({ listen: false });
});
afterAll(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe('CCP-22 real namespace boundary', () => {
  it('protects future nested routes with canonical errors', async () => {
    checkError(await request(app).post('/api/pos/sales'), 401, 'AUTH_REQUIRED');
    db.single.mockResolvedValueOnce({ data: { id: 'test-user', email: 'test@example.invalid', role: 'support' }, error: null });
    checkError(await request(app).get('/api/pos/orders/future').set('Authorization', `Bearer ${token('admin')}`), 403, 'FORBIDDEN');
  });
  it('preserves existing admin-only rejection for owners', async () => {
    const response = await request(app).post('/api/upload').set('Authorization', `Bearer ${token('owner')}`);
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: 'Admin access required' });
  });
  it('does not protect public health routes', async () => {
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});
