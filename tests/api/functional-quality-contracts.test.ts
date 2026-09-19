// @vitest-environment node
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { verifyQualityGateImport, verifyE2eImport, verifyProductionSmokeImport, verifyReviewedSecurityManifestInput, verifySecurityReviewCandidate } from '../../src/server/ci/trusted-ci-importer.js';

const testSecret = 'qa-release-e-test-secret';
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;
let getMonthPeriodBounds: typeof import('../../server').getMonthPeriodBounds;

function authToken(role: 'user' | 'admin') {
  return jwt.sign({ userId: `qa-${role}-user`, role }, testSecret, { expiresIn: '10m' });
}

let originalFetch: typeof globalThis.fetch;
let lastOrdersQueryUrl = '';
let customMockOrders: any[] | null = null;
let customMockTableRows: Record<string, any[]> = {};

beforeEach(() => {
  lastOrdersQueryUrl = '';
  customMockOrders = null;
  customMockTableRows = {};
});

afterAll(() => {
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  }
});

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = testSecret;
  process.env.SUPABASE_URL = 'https://mock-qa.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
  process.env.SUPABASE_ANON_KEY = 'mock-anon-key';
  process.env.STRIPE_SECRET_KEY = 'sk_test_qa_release_e_contract_only';

  originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url || '';
    if (url.includes('mock-qa.supabase.co')) {
      const headers = init?.headers;
      let accept = '';
      if (headers) {
        if (typeof headers.get === 'function') {
          accept = headers.get('accept') || headers.get('Accept') || '';
        } else if (typeof headers === 'object') {
          accept = headers.accept || headers.Accept || '';
        }
      }
      const isSingle = accept.includes('vnd.pgrst.object+json');

      if (url.includes('/stores')) {
        const storeObj = {
          id: 'qa-store-id',
          slug: 'selfcare-sinners',
          name: 'Selfcare Sinners'
        };
        return new Response(JSON.stringify(isSingle ? storeObj : [storeObj]), {
          status: 200,
          headers: {
            'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
            'Content-Range': '0-0/1'
          }
        });
      }
      if (url.includes('/orders')) {
        lastOrdersQueryUrl = url;
        if (url.includes('00000000-0000-0000-0000-000000000001')) {
          const orderObj = {
            id: '00000000-0000-0000-0000-000000000001',
            store_id: 'qa-store-id',
            customer_email: 'test@example.com',
            status: 'pagado',
            total: 100,
            refunded_amount: 0,
            stripe_session_id: 'cs_test_mock',
            stripe_payment_intent_id: 'pi_test_mock',
            order_items: [{ id: 'item-1', product_id: 'prod-1', quantity: 1, price: 100 }]
          };
          return new Response(JSON.stringify(isSingle ? orderObj : [orderObj]), {
            status: 200,
            headers: {
              'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
              'Content-Range': '0-0/1'
            }
          });
        }
        if (isSingle) {
          return new Response(JSON.stringify({
            code: 'PGRST116',
            details: 'Results contain 0 rows',
            message: 'JSON object requested, multiple (or no) rows returned'
          }), {
            status: 406,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        const returnedOrders = customMockOrders !== null ? customMockOrders : [];
        return new Response(JSON.stringify(returnedOrders), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': `0-${Math.max(0, returnedOrders.length - 1)}/${returnedOrders.length}`
          }
        });
      }
      for (const [tableKey, mockRows] of Object.entries(customMockTableRows)) {
        if (url.includes(`/${tableKey}`) && (!init || !init.method || init.method === 'GET')) {
          return new Response(JSON.stringify(mockRows), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': `0-${Math.max(0, mockRows.length - 1)}/${mockRows.length}`
            }
          });
        }
      }
      if (init?.body && (init.method === 'POST' || init.method === 'PUT' || init.method === 'PATCH')) {
        let parsed: any;
        try { parsed = JSON.parse(init.body); } catch (_e) { parsed = {}; }
        const row = Array.isArray(parsed) ? (parsed[0] || {}) : parsed;
        const resultRow = { id: 'mock-uuid-1', ...row };
        return new Response(JSON.stringify(isSingle ? resultRow : (Array.isArray(parsed) ? parsed.map((r: any, i: number) => ({ id: `mock-uuid-${i + 1}`, ...r })) : [resultRow])), {
          status: 200,
          headers: {
            'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
            'Content-Range': '0-0/1'
          }
        });
      }
      if (isSingle) {
        return new Response(JSON.stringify({
          code: 'PGRST116',
          details: 'Results contain 0 rows',
          message: 'JSON object requested, multiple (or no) rows returned'
        }), {
          status: 406,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Range': '0-0/0'
        }
      });
    }
    return originalFetch(input, init);
  };

  const server = await import('../../server');
  getMonthPeriodBounds = server.getMonthPeriodBounds;
  app = await server.startServer({ listen: false });
}, 30000);

describe('QA / RELEASE E API functional and quality contracts', () => {
  // --------------------------------------------------------------------------
  // TASK 1: Orders Contract Tests
  // --------------------------------------------------------------------------
  describe('TASK 1 — Orders Contract Tests', () => {
    it('denies guest access to customer order list with 401', async () => {
      const response = await request(app).get('/api/orders/my');
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: 'Unauthorized' });
    });

    it('allows authenticated customer to access their own order list', async () => {
      const response = await request(app)
        .get('/api/orders/my')
        .set('Authorization', `Bearer ${authToken('user')}`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('rejects order tracking when required query parameters are missing', async () => {
      const response = await request(app).get('/api/orders/track');
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Email and order_id required' });
    });

    it('rejects order tracking when only email is provided without order_id', async () => {
      const response = await request(app).get('/api/orders/track?email=test@example.com');
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Email and order_id required' });
    });

    it('rejects order tracking when only order_id is provided without email', async () => {
      const response = await request(app).get('/api/orders/track?order_id=00000000-0000-0000-0000-000000000000');
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Email and order_id required' });
    });

    it('returns error or 404 for tracking nonexistent order without leaking data', async () => {
      const response = await request(app).get('/api/orders/track?email=test@example.com&order_id=00000000-0000-0000-0000-000000000000');
      expect([404, 500]).toContain(response.status);
    });

    it('denies guest access to admin orders list with 401', async () => {
      const response = await request(app).get('/api/admin/orders');
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: 'Unauthorized' });
    });

    it('denies non-admin user access to admin orders list with 403', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${authToken('user')}`);
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ error: 'Admin access required' });
    });

    it('allows admin token to query admin orders endpoint', async () => {
      const response = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${authToken('admin')}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });

    it('denies guest access to admin order detail with 401', async () => {
      const response = await request(app).get('/api/admin/orders/00000000-0000-0000-0000-000000000000');
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: 'Unauthorized' });
    });

    it('denies non-admin user access to admin order detail with 403', async () => {
      const response = await request(app)
        .get('/api/admin/orders/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${authToken('user')}`);
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ error: 'Admin access required' });
    });
  });

  // --------------------------------------------------------------------------
  // TASK 2: Email Flows Contract Tests
  // --------------------------------------------------------------------------
  describe('TASK 2 — Email Flows Contract Tests', () => {
    it('denies guest access to admin resend confirmation with 401', async () => {
      const response = await request(app).post('/api/admin/orders/00000000-0000-0000-0000-000000000000/resend-confirmation');
      expect(response.status).toBe(401);
      expect(response.body).toMatchObject({ error: 'Unauthorized' });
    });

    it('denies non-admin user access to admin resend confirmation with 403', async () => {
      const response = await request(app)
        .post('/api/admin/orders/00000000-0000-0000-0000-000000000000/resend-confirmation')
        .set('Authorization', `Bearer ${authToken('user')}`);
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ error: 'Admin access required' });
    });

    it('enforces Resend webhook signature verification headers', async () => {
      const response = await request(app)
        .post('/api/webhooks/resend')
        .send({ type: 'email.sent' });
      expect([400, 500]).toContain(response.status);
    });

    it('rejects Resend webhook with invalid svix signature headers', async () => {
      const response = await request(app)
        .post('/api/webhooks/resend')
        .set('svix-id', 'msg_test_123')
        .set('svix-timestamp', '1789703323')
        .set('svix-signature', 'v1,invalid_signature')
        .send({ type: 'email.sent' });
      expect([400, 500]).toContain(response.status);
    });
  });

  // --------------------------------------------------------------------------
  // TASK 3: Authorization Matrix
  // --------------------------------------------------------------------------
  describe('TASK 3 — Sensitive Endpoints Authorization Matrix', () => {
    const sensitiveEndpoints = [
      { name: 'admin diagnostics', method: 'get', path: '/api/admin/diagnostics' },
      { name: 'admin orders list', method: 'get', path: '/api/admin/orders' },
      { name: 'legacy upload', method: 'post', path: '/api/upload' },
      { name: 'admin refund', method: 'post', path: '/api/admin/orders/00000000-0000-0000-0000-000000000000/refund' },
      { name: 'admin resend confirmation', method: 'post', path: '/api/admin/orders/00000000-0000-0000-0000-000000000000/resend-confirmation' },
    ];

    sensitiveEndpoints.forEach(({ name, method, path }) => {
      it(`enforces guest denial (401) on ${name}`, async () => {
        const res = await (request(app) as any)[method](path);
        expect(res.status).toBe(401);
        expect(res.body).toMatchObject({ error: 'Unauthorized' });
      });

      it(`enforces non-admin user denial (403) on ${name}`, async () => {
        const res = await (request(app) as any)[method](path)
          .set('Authorization', `Bearer ${authToken('user')}`);
        expect(res.status).toBe(403);
        expect(res.body).toMatchObject({ error: 'Admin access required' });
      });

      it(`allows admin token to pass authorization gate on ${name}`, async () => {
        const res = await (request(app) as any)[method](path)
          .set('Authorization', `Bearer ${authToken('admin')}`);
        expect(res.status).not.toBe(401);
        expect(res.status).not.toBe(403);
      });
    });
  });

  // --------------------------------------------------------------------------
  // TASK 4: Refund Contract Tests
  // --------------------------------------------------------------------------
  describe('TASK 4 — Refund Contract Tests', () => {
    it('denies guest caller from executing refunds with 401', async () => {
      const response = await request(app)
        .post('/api/admin/orders/00000000-0000-0000-0000-000000000000/refund')
        .send({ amount: 100 });
      expect(response.status).toBe(401);
    });

    it('denies authenticated non-admin caller from executing refunds with 403', async () => {
      const response = await request(app)
        .post('/api/admin/orders/00000000-0000-0000-0000-000000000000/refund')
        .set('Authorization', `Bearer ${authToken('user')}`)
        .send({ amount: 100 });
      expect(response.status).toBe(403);
    });

    it('rejects refund request with negative amount', async () => {
      const response = await request(app)
        .post('/api/admin/orders/00000000-0000-0000-0000-000000000001/refund')
        .set('Authorization', `Bearer ${authToken('admin')}`)
        .send({ amount: -15 });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Refund amount must be greater than zero' });
    });

    it('rejects refund request with zero amount', async () => {
      const response = await request(app)
        .post('/api/admin/orders/00000000-0000-0000-0000-000000000001/refund')
        .set('Authorization', `Bearer ${authToken('admin')}`)
        .send({ amount: 0 });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Refund amount must be greater than zero' });
    });

    it('rejects refund request exceeding order refundable total', async () => {
      const response = await request(app)
        .post('/api/admin/orders/00000000-0000-0000-0000-000000000001/refund')
        .set('Authorization', `Bearer ${authToken('admin')}`)
        .send({ amount: 250 });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Refund amount exceeds remaining refundable total' });
    });

    it('rejects partial refund when restock=true before calling Stripe', async () => {
      const response = await request(app)
        .post('/api/admin/orders/00000000-0000-0000-0000-000000000001/refund')
        .set('Authorization', `Bearer ${authToken('admin')}`)
        .send({ amount: 50, restock: true });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Inventory restock is only supported for full order refunds.' });
    });
  });

  // --------------------------------------------------------------------------
  // TASK 7: Input Validation Tests
  // --------------------------------------------------------------------------
  describe('TASK 7 — Input Validation', () => {
    it('rejects checkout with missing orderId', async () => {
      const response = await request(app).post('/api/checkout').send({});
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'orderId is required' });
    });

    it('rejects authentication with missing credentials', async () => {
      const response = await request(app).post('/api/login').send({});
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Email and password required' });
    });

    it('rejects authentication with empty string credentials', async () => {
      const response = await request(app).post('/api/login').send({ email: '   ', password: '' });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Email and password required' });
    });

    it('rejects order tracking with missing parameters', async () => {
      const response = await request(app).get('/api/orders/track').query({ email: 'only-email@test.com' });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Email and order_id required' });
    });

    it('rejects contact submission with missing required fields', async () => {
      const response = await request(app).post('/api/contact').send({ name: 'Test' });
      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ error: 'Missing fields' });
    });
  });

  // --------------------------------------------------------------------------
  // TASK 6: Rate Limiting & SEC-005 Login Rate Limiter Tests
  // --------------------------------------------------------------------------
  describe('TASK 6 — Rate Limiting Matrix & SEC-005 Login Rate Limiter', () => {
    it('mounts rate limiter on checkout route and exposes rate limit headers', async () => {
      const response = await request(app).post('/api/checkout').send({});
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(Number(response.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
    });

    it('mounts rate limiter on orders route and exposes rate limit headers', async () => {
      const response = await request(app).post('/api/orders').send({});
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(Number(response.headers['x-ratelimit-limit'])).toBeGreaterThan(0);
    });

    it('mounts rate limiter on contact route', async () => {
      const response = await request(app).post('/api/contact').send({});
      expect(response.status).toBe(400);
      expect(response.headers).toHaveProperty('x-ratelimit-limit');
    });

    it('enforces email sensitive limiter on forgot-password', async () => {
      const response = await request(app).post('/api/forgot-password').send({});
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(Number(response.headers['ratelimit-limit'])).toBe(5);
    });

    it('enforces email sensitive limiter on resend-verification', async () => {
      const response = await request(app).post('/api/resend-verification').send({});
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(Number(response.headers['ratelimit-limit'])).toBe(5);
    });

    it('enforces admin email limiter on admin resend confirmation', async () => {
      const response = await request(app)
        .post('/api/admin/orders/00000000-0000-0000-0000-000000000000/resend-confirmation')
        .set('Authorization', `Bearer ${authToken('admin')}`);
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(Number(response.headers['ratelimit-limit'])).toBe(10);
    });

    it('mounts dedicated loginLimiter on /api/login and exposes standard rate limit headers', async () => {
      const response = await request(app).post('/api/login').send({ email: 'test@example.com', password: 'test' });
      expect(response.headers).toHaveProperty('ratelimit-limit');
      expect(Number(response.headers['ratelimit-limit'])).toBe(10);
      expect(response.headers).toHaveProperty('ratelimit-remaining');
    });

    it('enforces SEC-005: exceeding login rate limit returns 429 with retry headers and does not leak account existence', async () => {
      let lastResponse;
      // Burst requests from this IP until login rate limit (10) is exhausted
      for (let i = 0; i < 12; i++) {
        lastResponse = await request(app)
          .post('/api/login')
          .send({ email: 'burst.attempt@example.com', password: 'invalid-password' });
        if (lastResponse.status === 429) break;
      }

      expect(lastResponse).toBeDefined();
      expect(lastResponse!.status).toBe(429);
      expect(lastResponse!.body).toEqual({ error: 'Too many login attempts, please try again later.' });
      expect(lastResponse!.headers).toHaveProperty('retry-after');
      expect(lastResponse!.headers).toHaveProperty('ratelimit-reset');

      // Security check: ensure 429 response does not leak credentials or user existence
      expect(lastResponse!.body).not.toHaveProperty('user');
      expect(lastResponse!.body).not.toHaveProperty('email');
      expect(lastResponse!.body).not.toHaveProperty('password');
      expect(lastResponse!.body).not.toHaveProperty('userId');
    });
  });

  // --------------------------------------------------------------------------
  // POST-LAUNCH 20: PL20-01 Evidence-Driven Final Scale Contracts
  // --------------------------------------------------------------------------
  describe('POST-LAUNCH 20 — PL20-01 Evidence-Driven Final Scale Contracts', () => {
    it('1. PL20 admin routes reject unauthenticated guests with 401', async () => {
      const summaryRes = await request(app).get('/api/admin/final-scale/summary');
      expect(summaryRes.status).toBe(401);
      expect(summaryRes.body).toMatchObject({ error: 'Unauthorized' });

      const techRes = await request(app).post('/api/admin/final-scale/technical-assessment/run').send({});
      expect(techRes.status).toBe(401);

      const costsRes = await request(app).post('/api/admin/final-scale/operating-costs/run').send({});
      expect(costsRes.status).toBe(401);
    });

    it('2. PL20 admin routes reject non-admin authenticated users with 403', async () => {
      const token = authToken('user');
      const response = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).toBe(403);
      expect(response.body).toMatchObject({ error: 'Admin access required' });

      const postRes = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${token}`)
        .send({});
      expect(postRes.status).toBe(403);
    });

    it('3. technical assessment sets score: null on all criteria and marks unmeasured load capacity as warning', async () => {
      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-tech-assessment' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(Array.isArray(res.body.assessments)).toBe(true);

      for (const item of res.body.assessments) {
        expect(item.score).toBeNull();
      }

      const keys = res.body.assessments.map((a: any) => a.assessment_key);
      expect(keys).toContain('runtime_database_connectivity');
      expect(keys).toContain('security_baseline_enforcement');
      expect(keys).toContain('load_concurrency_capacity');

      const loadCapacity = res.body.assessments.find((a: any) => a.assessment_key === 'load_concurrency_capacity');
      expect(loadCapacity).toBeDefined();
      expect(loadCapacity.score).toBeNull();
      expect(loadCapacity.status).toBe('warning');
    });

    it('4. commercial assessment query selects production columns and NEVER queries payment_status', async () => {
      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/commercial-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-query-check' });
      expect(res.status).toBe(200);

      // Verify Supabase query URL does NOT reference payment_status
      expect(lastOrdersQueryUrl).not.toContain('payment_status');
      expect(lastOrdersQueryUrl).toContain('financial_status');
      expect(lastOrdersQueryUrl).toContain('paid_at');
      expect(lastOrdersQueryUrl).toContain('refunded_amount');
    });

    it('5. commercial assessment paid-like contract correctly identifies paid orders and computes net metrics', async () => {
      customMockOrders = [
        { id: 'o-1', store_id: 'qa-store-id', paid_at: '2026-09-15T10:00:00Z', total: 100, refunded_amount: 0, status: 'arbitrary' },
        { id: 'o-2', store_id: 'qa-store-id', paid_at: null, financial_status: 'paid', total: 150, refunded_amount: 25, status: 'pending_fulfillment' },
        { id: 'o-3', store_id: 'qa-store-id', paid_at: null, financial_status: 'reconciled', total: 50, refunded_amount: 0, status: 'done' },
        { id: 'o-4', store_id: 'qa-store-id', paid_at: null, financial_status: null, total: 75, refunded_amount: 0, status: 'pagado' },
        { id: 'o-5', store_id: 'qa-store-id', paid_at: null, financial_status: null, total: 60, refunded_amount: 0, status: 'empacado' },
        { id: 'o-6', store_id: 'qa-store-id', paid_at: null, financial_status: null, total: 40, refunded_amount: 0, status: 'enviado' },
        { id: 'o-7', store_id: 'qa-store-id', paid_at: null, financial_status: null, total: 80, refunded_amount: 0, status: 'entregado' },
        { id: 'o-8', store_id: 'qa-store-id', paid_at: null, financial_status: null, total: 90, refunded_amount: 20, status: 'partially_refunded' },
        // Excluded:
        { id: 'o-9', store_id: 'qa-store-id', paid_at: null, financial_status: 'unpaid', total: 200, refunded_amount: 0, status: 'pendiente' },
        { id: 'o-10', store_id: 'qa-store-id', paid_at: null, financial_status: null, total: 300, refunded_amount: 0, status: 'cancelado' },
        { id: 'o-11', store_id: 'qa-store-id', paid_at: null, financial_status: 'failed', total: 100, refunded_amount: 0, status: 'payment_failed' },
        { id: 'o-12', store_id: 'qa-store-id', paid_at: null, financial_status: null, total: 100, refunded_amount: 0, status: 'inventory_exception' }
      ];

      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/commercial-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-paid-like' });
      expect(res.status).toBe(200);

      const perf = res.body.assessments.find((a: any) => a.assessment_key === 'commercial_volume_performance');
      expect(perf).toBeDefined();
      expect(perf.status).toBe('measured');
      expect(perf.score).toBeNull();

      // Evidence provenance checks
      expect(perf.evidence).toMatchObject({
        sourceTable: 'orders',
        calculationVersion: 'pl20-02-v1',
        measured_state: 'MEASURED',
        windowStart: 'all_time',
        windowEnd: 'all_time',
        totalOrders: 12,
        paidCount: 8,
        grossPaidRevenue: 645,
        refundedAmount: 45,
        netPaidRevenue: 600,
        aov: 80.63
      });
      expect(perf.evidence.paidLikeDefinition).toContain('paid_at IS NOT NULL');
      expect(perf.finding).toContain('645.00');
      expect(perf.finding).toContain('45.00');
      expect(perf.finding).toContain('600.00');
      expect(perf.finding).toContain('80.63');
    });

    it('6. commercial assessment marks warning and score: null when zero paid commercial orders exist', async () => {
      customMockOrders = [
        { id: 'o-1', store_id: 'qa-store-id', paid_at: null, financial_status: null, status: 'pendiente', total: 50, refunded_amount: 0 }
      ];

      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/commercial-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-zero-orders' });
      expect(res.status).toBe(200);

      const assessments = res.body.assessments;
      for (const a of assessments) {
        expect(a.score).toBeNull();
      }

      const perf = assessments.find((a: any) => a.assessment_key === 'commercial_volume_performance');
      expect(perf).toBeDefined();
      expect(perf.status).toBe('warning');
      expect(perf.finding).toContain('Zero paid commercial transactions');

      const ops = assessments.find((a: any) => a.assessment_key === 'operations_and_fulfillment');
      expect(ops.status).toBe('not_measured');
      expect(ops.score).toBeNull();
    });

    it('7. capacity assessment sets score: null and marks synthetic load testing as not_measured', async () => {
      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/capacity/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-capacity' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      for (const c of res.body.capacity) {
        expect(c.score).toBeNull();
      }

      const railway = res.body.capacity.find((c: any) => c.capacity_key === 'railway_runtime_capacity');
      expect(railway.status).toBe('warning');

      const db = res.body.capacity.find((c: any) => c.capacity_key === 'supabase_database_capacity');
      expect(db.status).toBe('warning');

      const synthetic = res.body.capacity.find((c: any) => c.capacity_key === 'synthetic_vs_load_testing');
      expect(synthetic.status).toBe('not_measured');
    });

    it('8. investor readiness assessment sets score: null and marks operating cost transparency as not_measured', async () => {
      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/investor-readiness/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-investor' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      for (const check of res.body.checks) {
        expect(check.score).toBeNull();
      }

      const costTransparency = res.body.checks.find((c: any) => c.check_key === 'operating_cost_transparency');
      expect(costTransparency).toBeDefined();
      expect(costTransparency.status).toBe('not_measured');
      expect(costTransparency.score).toBeNull();
    });

    it('9. operating costs sets measured_state: NOT_MEASURED when unestimated', async () => {
      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-09' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      const cost = res.body.costs[0];
      expect(cost.total_estimate).toBe(0);
      expect(cost.metadata.measured_state).toBe('NOT_MEASURED');
      expect(cost.metadata.has_explicit_estimates).toBe(false);
    });

    it('10. operating costs sets measured_state: PARTIAL for arbitrary numbers without provenance, and MEASURED when full provider provenance is supplied', async () => {
      const adminToken = authToken('admin');

      // Numeric values alone without provider provenance remain PARTIAL (Task 8)
      const resPartial = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          railwayEstimate: 20,
          supabaseEstimate: 50,
          stripeEstimate: 15,
          emailEstimate: 5
        });
      expect(resPartial.status).toBe(200);
      expect(resPartial.body.status).toBe('ok');

      const costPartial = resPartial.body.costs[0];
      expect(costPartial.total_estimate).toBeNull();
      expect(costPartial.metadata.measured_provider_total).toBe(0);
      expect(costPartial.metadata.total_is_partial).toBe(true);
      expect(costPartial.metadata.measured_state).toBe('PARTIAL');
      expect(costPartial.metadata.has_explicit_estimates).toBe(true);

      // Full provider evidence with verified provenance achieves MEASURED
      const resMeasured = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            railway: {
              amount: 45,
              allocation_model: 'resource_based',
              source_type: 'resource_telemetry',
              evidence_reference: 'metrics:railway-store-resource-sep2026',
              period_start: '2026-09-01',
              period_end: '2026-09-30'
            },
            supabase: {
              amount: 0,
              plan: 'free_tier',
              source_type: 'provider_billing',
              provided_by: 'qa-admin',
              evidence_reference: 'attestation:supabase_free_tier',
              period_start: '2026-09-01',
              period_end: '2026-09-30',
              caveats: ['free tier plan active']
            },
            stripe: {
              amount: 15.5,
              source_type: 'provider_export',
              evidence_reference: 'export:stripe-sep2026.csv',
              period_start: '2026-09-01',
              period_end: '2026-09-30'
            },
            resend: {
              amount: 0,
              plan: 'free_tier',
              source_type: 'provider_billing',
              provided_by: 'qa-admin',
              evidence_reference: 'attestation:resend_free_tier',
              period_start: '2026-09-01',
              period_end: '2026-09-30',
              caveats: ['free tier plan active']
            }
          }
        });
      expect(resMeasured.status).toBe(200);
      const costMeasured = resMeasured.body.costs[0];
      expect(costMeasured.metadata.measured_state).toBe('MEASURED');
      expect(costMeasured.metadata.is_cost_evidence_measured).toBe(true);
      expect(costMeasured.total_estimate).toBe(60.5);
      expect(costMeasured.metadata.measured_provider_total).toBe(60.5);
    });

    it('11. isolates legacy seed rows and derives finalScaleReady === false when capacity and costs are unmeasured', async () => {
      // Simulate database holding legacy seed rows and unmeasured capacity/cost states
      customMockTableRows['strategic_risk_matrix'] = [
        { id: 'seed-risk', risk_key: 'seed_critical_risk', severity: 'critical', status: 'open', metadata: { source: 'PL20 seed' } }
      ];
      customMockTableRows['technical_debt_matrix'] = [
        { id: 'seed-debt', debt_key: 'seed_critical_debt', severity: 'critical', status: 'open', metadata: { source: 'scripts/db/026_post_launch_20' } }
      ];
      customMockTableRows['final_technical_assessments'] = [
        { id: 't-1', assessment_key: 'runtime_database_connectivity', status: 'pass', score: null }
      ];
      customMockTableRows['scale_capacity_assessments'] = [
        { id: 'c-1', capacity_key: 'synthetic_vs_load_testing', status: 'not_measured', score: null }
      ];
      customMockTableRows['operating_cost_summaries'] = [
        { id: 'cost-1', total_estimate: 0, metadata: { measured_state: 'NOT_MEASURED' } }
      ];

      const adminToken = authToken('admin');
      const res = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      // Legacy seed rows are filtered out:
      expect(res.body.summary.risks).toBe(0);
      expect(res.body.summary.technicalDebtItems).toBe(0);
      expect(res.body.summary.evaluationRules.hasCriticalRisk).toBe(false);
      expect(res.body.summary.evaluationRules.hasCriticalDebt).toBe(false);

      // Unmeasured capacity load testing and cost evidence enforce finalScaleReady === false
      expect(res.body.summary.evaluationRules.isCapacityLoadMeasured).toBe(false);
      expect(res.body.summary.evaluationRules.isCostEvidenceMeasured).toBe(false);
      expect(res.body.summary.finalScaleReady).toBe(false);
    });

    it('12. enforces strict input validation across PL20 endpoints', async () => {
      const adminToken = authToken('admin');

      // Operating costs validation
      const negRes = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-09', railwayEstimate: -50 });
      expect(negRes.status).toBe(400);
      expect(negRes.body.error).toContain('railwayEstimate');

      const nanRes = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-09', supabaseEstimate: 'not-a-number' });
      expect(nanRes.status).toBe(400);
      expect(nanRes.body.error).toContain('supabaseEstimate');

      const badPeriod = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: 'invalid-period' });
      expect(badPeriod.status).toBe(400);
      expect(badPeriod.body.error).toContain('period');

      // RunKey validation
      const badKeyRes = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'bad key with spaces and special @#$% chars' });
      expect(badKeyRes.status).toBe(400);
      expect(badKeyRes.body.error).toContain('runKey');

      // Roadmap validation
      const badRoadmapRes = await request(app)
        .post('/api/admin/final-scale/strategic-roadmap')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ roadmapKey: 'test-roadmap', priority: 'invalid-priority' });
      expect(badRoadmapRes.status).toBe(400);
      expect(badRoadmapRes.body.error).toContain('priority');

      // Scale decision validation
      const badDecisionRes = await request(app)
        .post('/api/admin/final-scale/scale-decision')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ decisionKey: 'test-decision', decision: 'invalid-decision' });
      expect(badDecisionRes.status).toBe(400);
      expect(badDecisionRes.body.error).toContain('decision');
    });

    it('13. Rule 1: commercial assessment excludes cancelado + reconciled from revenue math, records anomaly conflict, and sets measured_state: PARTIAL', async () => {
      customMockOrders = [
        { id: 'o-legit', store_id: 'qa-store-id', paid_at: '2026-09-15T10:00:00Z', total: 100, refunded_amount: 0, status: 'entregado' },
        // Anomaly order: status is cancelado, but financial_status is reconciled:
        { id: 'o-conflict-1', store_id: 'qa-store-id', paid_at: null, financial_status: 'reconciled', total: 500, refunded_amount: 0, status: 'cancelado' },
        // Anomaly order: status is payment_failed, but paid_at is populated:
        { id: 'o-conflict-2', store_id: 'qa-store-id', paid_at: '2026-09-15T12:00:00Z', financial_status: null, total: 300, refunded_amount: 0, status: 'payment_failed' }
      ];

      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/commercial-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-conflict-check' });
      expect(res.status).toBe(200);

      const perf = res.body.assessments.find((a: any) => a.assessment_key === 'commercial_volume_performance');
      expect(perf).toBeDefined();
      expect(perf.status).toBe('measured');
      expect(perf.score).toBeNull();

      // Rule 1: Anomaly orders are strictly excluded from revenue math
      expect(perf.evidence.paidCount).toBe(1);
      expect(perf.evidence.grossPaidRevenue).toBe(100);
      expect(perf.evidence.netPaidRevenue).toBe(100);
      expect(perf.evidence.aov).toBe(100);

      // Rule 1: measured_state is PARTIAL and anomalies are recorded
      expect(perf.evidence.measured_state).toBe('PARTIAL');
      expect(perf.evidence.hasOrderAnomaly).toBe(true);
      expect(perf.evidence.anomalies.length).toBe(2);
      expect(perf.evidence.anomalies[0].orderId).toBe('o-conflict-1');
      expect(perf.evidence.anomalies[0].reason).toBe('CONFLICT_CANCELED_STATUS_WITH_PAID_FINANCIAL_INDICATOR');
      expect(perf.finding).toContain('PARTIAL: reconciliation anomaly detected');
    });

    it('14. Rule 2: PARTIAL operating costs do not satisfy finalScaleReady (strict MEASURED required)', async () => {
      const adminToken = authToken('admin');

      // Supply partial estimates (only 2 out of 4 providers)
      const costRunRes = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          railwayEstimate: 25,
          supabaseEstimate: 30
          // stripeEstimate and emailEstimate omitted -> PARTIAL
        });
      expect(costRunRes.status).toBe(200);
      expect(costRunRes.body.costs[0].metadata.measured_state).toBe('PARTIAL');

      // Now query summary: PARTIAL costs must yield isCostEvidenceMeasured === false and finalScaleReady === false
      const summaryRes = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.summary.evaluationRules.isCostEvidenceMeasured).toBe(false);
      expect(summaryRes.body.summary.finalScaleReady).toBe(false);
    });

    it('15. Rule 3: low volume is MEASURED with score: null, and commercial_track_record is warning with score: null', async () => {
      customMockOrders = [
        { id: 'o-single', store_id: 'qa-store-id', paid_at: '2026-09-16T12:00:00Z', total: 49.99, refunded_amount: 0, status: 'pagado' }
      ];

      const adminToken = authToken('admin');
      const commRes = await request(app)
        .post('/api/admin/final-scale/commercial-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-low-volume' });
      expect(commRes.status).toBe(200);

      const commPerf = commRes.body.assessments.find((a: any) => a.assessment_key === 'commercial_volume_performance');
      expect(commPerf.status).toBe('measured');
      expect(commPerf.score).toBeNull();
      expect(commPerf.evidence.measured_state).toBe('MEASURED');

      const invRes = await request(app)
        .post('/api/admin/final-scale/investor-readiness/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-inv-track-record' });
      expect(invRes.status).toBe(200);

      const trackRecord = invRes.body.checks.find((c: any) => c.check_key === 'commercial_track_record');
      expect(trackRecord).toBeDefined();
      expect(trackRecord.status).toBe('warning');
      expect(trackRecord.score).toBeNull();
      expect(trackRecord.evidence).toContain('Low commercial volume does not invalidate measurement');
    });

    it('16. Rule 4: rejects NOT_APPLICABLE for active production stack components with HTTP 400', async () => {
      const adminToken = authToken('admin');

      // Top-level measured_state: NOT_APPLICABLE on operating costs
      const naRes1 = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-09', measured_state: 'NOT_APPLICABLE' });
      expect(naRes1.status).toBe(400);
      expect(naRes1.body.error).toContain('NOT_APPLICABLE is forbidden for core stack components');

      // Individual provider marked N/A
      const naRes2 = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-09', railwayEstimate: 'N/A' });
      expect(naRes2.status).toBe(400);
      expect(naRes2.body.error).toContain('NOT_APPLICABLE is forbidden for core stack component');

      // Core capacity dimension marked not_applicable
      const naRes3 = await request(app)
        .post('/api/admin/final-scale/capacity/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'not_applicable' });
      expect(naRes3.status).toBe(400);
      expect(naRes3.body.error).toContain('NOT_APPLICABLE is forbidden for core capacity dimensions');
    });

    it('17. Rule 5: classifies rows lacking complete V1 provenance as HISTORICAL_STATIC_BASELINE', async () => {
      // Setup mock data with 1 row having complete V1 provenance and 1 row lacking provenance
      const measuredAt = new Date().toISOString();
      customMockTableRows['final_technical_assessments'] = [
        {
          id: 'v1-row',
          assessment_key: 'runtime_database_connectivity',
          status: 'pass',
          score: null,
          metadata: {
            source: 'api_final_scale_technical_assessment_run',
            source_type: 'api',
            calculation_version: 'pl20-01-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED'
          }
        },
        {
          id: 'legacy-row',
          assessment_key: 'legacy_seed_check',
          status: 'pass',
          score: null,
          metadata: { source: 'PL20 seed' } // Lacks calculation_version, measured_state, measured_at
        }
      ];

      const adminToken = authToken('admin');
      const res = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      // Only the v1 row is active; legacy row is excluded and counted in historicalBaselineRows
      expect(res.body.summary.technicalAssessments).toBe(1);
      expect(res.body.summary.historicalBaselineRows).toBeGreaterThanOrEqual(1);
    });
  });

  // --------------------------------------------------------------------------
  // POST-LAUNCH 20: PL20-02 Measurement Snapshot & Technical Evidence Integrity
  // --------------------------------------------------------------------------
  describe('POST-LAUNCH 20 — PL20-02 Measurement Snapshot & Technical Evidence Integrity', () => {
    const adminToken = authToken('admin');
    const targetCommit = 'pl20-target-sha-abcdef123456';

    const createPassingCiEvidence = (commitSha: string, options: { trustedE2e?: boolean } = {}) => {
      const keys = [
        'technical_release_gate',
        'technical_production_smoke',
        'technical_build',
        'technical_unit_tests',
        'technical_e2e',
        'technical_secret_scan',
        'technical_database_reproducibility',
        'technical_security_blockers'
      ];
      const measuredAt = new Date().toISOString();
      return keys.map((k, idx) => {
        const isDb = k === 'technical_database_reproducibility';
        const isSec = k === 'technical_security_blockers';
        const isE2e = k === 'technical_e2e';
        const classification = isDb ? 'PERSISTED_EVIDENCE' : 'VERIFIED_CI_EVIDENCE';
        const origin = isDb
          ? 'persisted_database_evidence'
          : (isSec ? 'reviewed_security' : 'persisted_trusted_import');
        const workflowIdentity = isE2e && options.trustedE2e ? 'Playwright E2E Runner' : 'Selfcare Quality Gate';

        return {
          id: `ci-tech-${idx + 1}`,
          assessment_key: k,
          status: 'pass',
          score: null,
          origin,
          source_classification: classification,
          open_count: isSec ? 0 : undefined,
          metadata: {
            source: 'github_actions_ci',
            source_type: isDb ? 'migration_history' : (isSec ? 'security_audit' : 'ci_pipeline'),
            source_classification: classification,
            origin,
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED',
            validated_commit_sha: commitSha,
            evidence_reference: `run:3542280042${idx}`,
            workflow_identity: workflowIdentity,
            open_count: isSec ? 0 : undefined
          },
          evidence: {
            validated_commit_sha: commitSha,
            source_classification: classification,
            origin,
            evidence_reference: `run:3542280042${idx}`,
            workflow_identity: workflowIdentity,
            measured_at: measuredAt,
            open_count: isSec ? 0 : undefined
          }
        };
      });
    };

    it('1. full fake request-body CI payload remains MANUAL_EVIDENCE', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commitSha: targetCommit,
          ciEvidence: {
            technical_build: {
              status: 'pass',
              validated_commit_sha: targetCommit,
              measured_at: new Date().toISOString(),
              run_id: '35422800421',
              evidence_reference: 'run:35422800421',
              workflow_identity: 'Selfcare Quality Gate',
              source_type: 'build_system'
            }
          }
        });
      expect(res.status).toBe(200);

      const buildItem = res.body.assessments.find((a: any) => a.assessment_key === 'technical_build');
      expect(buildItem).toBeDefined();
      expect(buildItem.metadata.source_classification).toBe('MANUAL_EVIDENCE');
      expect(buildItem.evidence.source_classification).toBe('MANUAL_EVIDENCE');
      expect(buildItem.metadata.origin).toBe('request_body');
      expect(buildItem.evidence.origin).toBe('request_body');
    });

    it('2. fake run ID cannot become VERIFIED_CI_EVIDENCE', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ciEvidence: {
            technical_release_gate: {
              status: 'pass',
              run_id: '99999999',
              evidence_reference: 'run:99999999',
              validated_commit_sha: targetCommit,
              measured_at: new Date().toISOString(),
              workflow_identity: 'Selfcare Quality Gate'
            }
          }
        });
      expect(res.status).toBe(200);

      const gateItem = res.body.assessments.find((a: any) => a.assessment_key === 'technical_release_gate');
      expect(gateItem.metadata.source_classification).not.toBe('VERIFIED_CI_EVIDENCE');
      expect(gateItem.metadata.source_classification).toBe('MANUAL_EVIDENCE');
    });

    it('3. fake workflow name cannot become VERIFIED_CI_EVIDENCE', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ciEvidence: {
            technical_unit_tests: {
              status: 'pass',
              workflow_name: 'Selfcare Quality Gate',
              workflow_identity: 'Selfcare Quality Gate',
              validated_commit_sha: targetCommit,
              measured_at: new Date().toISOString()
            }
          }
        });
      expect(res.status).toBe(200);

      const unitItem = res.body.assessments.find((a: any) => a.assessment_key === 'technical_unit_tests');
      expect(unitItem.metadata.source_classification).not.toBe('VERIFIED_CI_EVIDENCE');
      expect(unitItem.metadata.source_classification).toBe('MANUAL_EVIDENCE');
    });

    it('4. current SHA in manual payload does not increase trust', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          commit_sha: targetCommit,
          ciEvidence: {
            technical_secret_scan: {
              status: 'pass',
              validated_commit_sha: targetCommit,
              measured_at: new Date().toISOString()
            }
          }
        });
      expect(res.status).toBe(200);

      const secretItem = res.body.assessments.find((a: any) => a.assessment_key === 'technical_secret_scan');
      expect(secretItem.metadata.source_classification).toBe('MANUAL_EVIDENCE');
      expect(secretItem.metadata.origin).toBe('request_body');
    });

    it('5. request-body security blockers zero cannot satisfy readiness', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ciEvidence: {
            security_blockers: {
              status: 'pass',
              open_count: 0,
              validated_commit_sha: targetCommit,
              measured_at: new Date().toISOString(),
              evidence_reference: 'run:audit-123',
              workflow_identity: 'Security Audit'
            }
          }
        });
      expect(res.status).toBe(200);

      const secItem = res.body.assessments.find((a: any) => a.assessment_key === 'technical_security_blockers');
      expect(secItem.metadata.source_classification).toBe('MANUAL_EVIDENCE');
      expect(secItem.metadata.origin).toBe('request_body');

      customMockTableRows['final_technical_assessments'] = [secItem];
      const summaryRes = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.summary.evaluationRules.isSecurityBlockersSatisfied).toBe(false);
      expect(summaryRes.body.summary.evaluationRules.technicalRequiredPass).toBe(false);
    });

    it('6. caller cannot self-declare REVIEWED_SECURITY_EVIDENCE', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ciEvidence: {
            security_blockers: {
              status: 'pass',
              open_count: 0,
              source_classification: 'REVIEWED_SECURITY_EVIDENCE',
              classification: 'REVIEWED_SECURITY_EVIDENCE',
              origin: 'reviewed_security',
              validated_commit_sha: targetCommit,
              measured_at: new Date().toISOString()
            }
          }
        });
      expect(res.status).toBe(200);

      const secItem = res.body.assessments.find((a: any) => a.assessment_key === 'technical_security_blockers');
      expect(secItem.metadata.source_classification).toBe('MANUAL_EVIDENCE');
      expect(secItem.metadata.origin).toBe('request_body');
    });

    it('7. caller cannot self-declare persisted_trusted_import', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ciEvidence: {
            technical_build: {
              status: 'pass',
              source_classification: 'VERIFIED_CI_EVIDENCE',
              origin: 'persisted_trusted_import',
              validated_commit_sha: targetCommit,
              measured_at: new Date().toISOString(),
              evidence_reference: 'run:12345',
              workflow_identity: 'Selfcare Quality Gate'
            }
          }
        });
      expect(res.status).toBe(200);

      const buildItem = res.body.assessments.find((a: any) => a.assessment_key === 'technical_build');
      expect(buildItem.metadata.source_classification).toBe('MANUAL_EVIDENCE');
      expect(buildItem.metadata.origin).toBe('request_body');
    });

    it('8. persisted row claiming VERIFIED without trusted-origin marker is downgraded', async () => {
      const measuredAt = new Date().toISOString();
      customMockTableRows['final_technical_assessments'] = [
        {
          id: 'claim-1',
          assessment_key: 'technical_build',
          status: 'pass',
          score: null,
          metadata: {
            source: 'external_claim',
            source_type: 'ci_pipeline',
            source_classification: 'VERIFIED_CI_EVIDENCE',
            origin: 'request_body',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED',
            validated_commit_sha: targetCommit,
            evidence_reference: 'run:12345',
            workflow_identity: 'Selfcare Quality Gate'
          },
          evidence: {
            source_classification: 'VERIFIED_CI_EVIDENCE',
            origin: 'request_body',
            validated_commit_sha: targetCommit,
            measured_at: measuredAt,
            evidence_reference: 'run:12345',
            workflow_identity: 'Selfcare Quality Gate'
          }
        }
      ];

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const buildDim = res.body.summary.evaluationRules.technicalDimensions.build;
      expect(buildDim.classification).toBe('MANUAL_EVIDENCE');
      expect(res.body.summary.evaluationRules.technicalRequiredPass).toBe(false);
    });

    it('9. trusted-origin + full persisted provenance is eligible', async () => {
      const measuredAt = new Date().toISOString();
      customMockTableRows['final_technical_assessments'] = [
        {
          id: 'claim-trusted-1',
          assessment_key: 'technical_build',
          status: 'pass',
          score: null,
          metadata: {
            source: 'github_actions_ci',
            source_type: 'ci_pipeline',
            source_classification: 'VERIFIED_CI_EVIDENCE',
            origin: 'persisted_trusted_import',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED',
            validated_commit_sha: targetCommit,
            evidence_reference: 'run:35422800421',
            workflow_identity: 'Selfcare Quality Gate'
          },
          evidence: {
            source_classification: 'VERIFIED_CI_EVIDENCE',
            origin: 'persisted_trusted_import',
            validated_commit_sha: targetCommit,
            measured_at: measuredAt,
            evidence_reference: 'run:35422800421',
            workflow_identity: 'Selfcare Quality Gate'
          }
        }
      ];

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const buildDim = res.body.summary.evaluationRules.technicalDimensions.build;
      expect(buildDim.status).toBe('PASS');
      expect(buildDim.classification).toBe('VERIFIED_CI_EVIDENCE');
      expect(buildDim.origin).toBe('persisted_trusted_import');
      expect(buildDim.validated_commit_sha).toBe(targetCommit);
    });

    it('10. missing E2E trusted source keeps technicalRequiredPass false', async () => {
      // 7 other dimensions have trusted-origin evidence, but e2e is claimed from Quality Gate (which does NOT run E2E)
      const evidence = createPassingCiEvidence(targetCommit);
      customMockTableRows['final_technical_assessments'] = evidence;

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const rules = res.body.summary.evaluationRules;
      expect(rules.technicalDimensions.e2e.classification).toBe('MANUAL_EVIDENCE');
      expect(rules.technicalRequiredPass).toBe(false);
    });

    it('11. finalScaleReady remains false', async () => {
      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.finalScaleReady).toBe(false);
    });

    it('12. existing auth/security contracts remain green', async () => {
      const unauthorizedRes = await request(app).get('/api/admin/final-scale/summary');
      expect(unauthorizedRes.status).toBe(401);

      const nonAdminToken = authToken('user');
      const forbiddenRes = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${nonAdminToken}`);
      expect(forbiddenRes.status).toBe(403);
    });

    it('13. runtime cannot fabricate CI PASS (calling technical assessment without CI evidence marks CI dimensions NOT_MEASURED)', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      const ciKeys = [
        'technical_release_gate',
        'technical_production_smoke',
        'technical_build',
        'technical_unit_tests',
        'technical_e2e',
        'technical_secret_scan',
        'technical_database_reproducibility',
        'technical_security_blockers'
      ];

      for (const ciKey of ciKeys) {
        const item = res.body.assessments.find((a: any) => a.assessment_key === ciKey);
        expect(item).toBeDefined();
        expect(item.status).toBe('not_measured');
        expect(item.metadata.validated_commit_sha).toBeNull();
      }

      const secItem = res.body.assessments.find((a: any) => a.assessment_key === 'technical_security_blockers');
      expect(secItem.metadata.open_count).toBeNull();
      expect(secItem.metadata.measured_state).toBe('NOT_MEASURED');

      // Runtime dimensions are classified as RUNTIME_OBSERVED
      const dbItem = res.body.assessments.find((a: any) => a.assessment_key === 'runtime_database_connectivity');
      expect(dbItem).toBeDefined();
      expect(dbItem.metadata.source_classification).toBe('RUNTIME_OBSERVED');
    });

    it('14. runtime RSS does not satisfy capacity load evidence', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/capacity/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-capacity-runtime-rss' });
      expect(res.status).toBe(200);

      const rssItem = res.body.assessments.find((a: any) => a.capacity_key === 'railway_runtime_capacity');
      expect(rssItem).toBeDefined();
      expect(rssItem.metadata.semantic_dimension).toBe('runtime_health');
      expect(rssItem.metadata.is_scale_capacity).toBe(false);
    });

    it('15. DB connectivity does not satisfy load capacity', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/capacity/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-capacity-db-conn' });
      expect(res.status).toBe(200);

      const dbItem = res.body.assessments.find((a: any) => a.capacity_key === 'supabase_database_capacity');
      expect(dbItem).toBeDefined();
      expect(dbItem.metadata.semantic_dimension).toBe('database_runtime_health');
      expect(dbItem.metadata.is_scale_capacity).toBe(false);

      customMockTableRows['scale_capacity_assessments'] = [dbItem];
      const summaryRes = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.summary.evaluationRules.isCapacityLoadMeasured).toBe(false);
    });

    it('16. commercial metrics retain exact provenance and no PII', async () => {
      customMockOrders = [
        { id: 'o-pii-1', store_id: 'qa-store-id', customer_email: 'secret@buyer.com', paid_at: '2026-09-17T00:00:00Z', total: 100, refunded_amount: 0, status: 'pagado' }
      ];

      const res = await request(app)
        .post('/api/admin/final-scale/commercial-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-provenance-no-pii' });
      expect(res.status).toBe(200);

      const perf = res.body.assessments.find((a: any) => a.assessment_key === 'commercial_volume_performance');
      expect(perf).toBeDefined();
      expect(perf.metadata).toMatchObject({
        source: 'api_final_scale_commercial_assessment_run',
        source_type: 'api',
        calculation_version: 'pl20-02-v1',
        measured_state: 'MEASURED'
      });
      expect(perf.evidence).toMatchObject({
        measurement_window: 'all_time',
        freshness_threshold: 86400,
        raw_metrics: expect.objectContaining({ totalOrders: 1, paidCount: 1, grossPaidRevenue: 100 })
      });
      expect(Array.isArray(perf.evidence.caveats)).toBe(true);

      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('secret@buyer.com');
    });

    it('17. commercial low volume remains measured + warning track record', async () => {
      customMockOrders = [
        { id: 'o-low-1', store_id: 'qa-store-id', paid_at: '2026-09-17T00:00:00Z', total: 50, refunded_amount: 0, status: 'pagado' }
      ];

      const res = await request(app)
        .post('/api/admin/final-scale/commercial-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-low-vol' });
      expect(res.status).toBe(200);

      const perf = res.body.assessments.find((a: any) => a.assessment_key === 'commercial_volume_performance');
      expect(perf.status).toBe('measured');
      expect(perf.score).toBeNull();
      expect(perf.evidence.caveats[0]).toContain('Low commercial volume');
    });

    it('18. partial provider costs remain insufficient', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-09', railwayEstimate: 15, supabaseEstimate: 25 });
      expect(res.status).toBe(200);
      expect(res.body.cost.metadata.measured_state).toBe('PARTIAL');

      customMockTableRows['operating_cost_summaries'] = [res.body.cost];
      const summaryRes = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.summary.evaluationRules.isCostEvidenceMeasured).toBe(false);
    });

    it('19. legacy static rows remain excluded', async () => {
      const measuredAt = new Date().toISOString();
      customMockTableRows['strategic_risk_matrix'] = [
        {
          id: 'v1-risk',
          risk_key: 'known_risk',
          severity: 'low',
          status: 'open',
          metadata: {
            source: 'api_final_scale_risk_matrix_run',
            source_type: 'api',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED'
          }
        },
        {
          id: 'legacy-risk',
          risk_key: 'legacy_seed_risk',
          severity: 'critical',
          status: 'open',
          metadata: { source: 'PL20 seed script' }
        }
      ];

      const res = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.risks).toBe(1);
      expect(res.body.summary.historicalBaselineRows).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.evaluationRules.hasCriticalRisk).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // POST-LAUNCH 20: PL20-03A Real Operating Cost Contract & Capacity Infrastructure
  // --------------------------------------------------------------------------
  describe('POST-LAUNCH 20 — PL20-03A Real Operating Cost Contract & Capacity Infrastructure', () => {
    const adminToken = authToken('admin');

    it('1. Railway shared_unallocated 192 does not enter ecommerce attributable total', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            railway: {
              account_total: 192,
              shared_hosts: 4,
              allocation_model: 'shared_unallocated'
            }
          }
        });
      expect(res.status).toBe(200);
      const cost = res.body.cost;
      const meta = cost.metadata;
      expect(meta.measured_provider_total).toBe(0);
      expect(cost.total_estimate).toBeNull();
      expect(meta.shared_account_costs.railway).toBe(192);
      expect(meta.shared_unallocated_amounts.railway).toBe(192);
      expect(meta.unallocated_providers).toContain('railway');
    });

    it('2. account_total remains 192', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            railway: {
              account_total: 192,
              shared_hosts: 4,
              allocation_model: 'shared_unallocated'
            }
          }
        });
      expect(res.status).toBe(200);
      const railway = res.body.cost.metadata.providers.railway;
      expect(railway.account_total).toBe(192);
      expect(railway.shared_hosts).toBe(4);
      expect(railway.allocation_model).toBe('shared_unallocated');
      expect(res.body.cost.metadata.shared_account_costs.railway).toBe(192);
    });

    it('3. Railway ecommerce amount remains null', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            railway: {
              account_total: 192,
              shared_hosts: 4,
              allocation_model: 'shared_unallocated'
            }
          }
        });
      expect(res.status).toBe(200);
      const railway = res.body.cost.metadata.providers.railway;
      expect(railway.amount).toBeNull();
      expect(res.body.cost.railway_estimate).toBeNull();
    });

    it('4. no automatic 48 allocation', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            railway: {
              account_total: 192,
              shared_hosts: 4,
              allocation_model: 'shared_unallocated'
            }
          }
        });
      expect(res.status).toBe(200);
      const railway = res.body.cost.metadata.providers.railway;
      expect(railway.amount).not.toBe(48);
      expect(railway.amount).toBeNull();
      expect(railway.caveats.some((c: string) => /not automatically divide by 4|48 MXN/i.test(c))).toBe(true);
    });

    it('5. measured_provider_total excludes PARTIAL providers', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            railway: { account_total: 192, allocation_model: 'shared_unallocated' }, // PARTIAL, amount null
            supabase: { amount: 0, plan: 'free_tier', source_type: 'provider_billing', provided_by: 'admin', evidence_reference: 'attestation:sb' }, // MEASURED
            stripe: { amount: 50, source_type: 'fee_structure_estimate' }, // PARTIAL
            resend: { amount: 0, plan: 'free_tier', source_type: 'provider_billing', provided_by: 'admin', evidence_reference: 'attestation:rs' } // MEASURED
          }
        });
      expect(res.status).toBe(200);
      const meta = res.body.cost.metadata;
      expect(meta.measured_provider_total).toBe(0); // Only supabase(0) and resend(0) are MEASURED -> 0 + 0 = 0
      expect(meta.partial_provider_amounts.stripe).toBe(50);
      expect(res.body.cost.total_estimate).toBeNull();
      expect(meta.total_is_partial).toBe(true);
      expect(meta.cost_total_state).toBe('PARTIAL');
    });

    it('6. total all-four-MEASURED sums correctly', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            railway: {
              amount: 55.0,
              allocation_model: 'resource_based',
              source_type: 'resource_telemetry',
              evidence_reference: 'metrics:railway_host_isolated',
              period_start: '2026-09-01',
              period_end: '2026-09-30'
            },
            supabase: {
              amount: 0,
              plan: 'free_tier',
              source_type: 'provider_billing',
              provided_by: 'admin',
              evidence_reference: 'attestation:supabase_free_tier',
              period_start: '2026-09-01',
              period_end: '2026-09-30',
              caveats: ['free tier active']
            },
            stripe: {
              amount: 42.15,
              source_type: 'provider_export',
              evidence_reference: 'export:stripe_actual_sep2026.csv',
              period_start: '2026-09-01',
              period_end: '2026-09-30'
            },
            resend: {
              amount: 0,
              plan: 'free_tier',
              source_type: 'provider_billing',
              provided_by: 'admin',
              evidence_reference: 'attestation:resend_free_tier',
              period_start: '2026-09-01',
              period_end: '2026-09-30',
              caveats: ['free tier active']
            }
          }
        });
      expect(res.status).toBe(200);
      const cost = res.body.cost;
      expect(cost.metadata.cost_total_state).toBe('MEASURED');
      expect(cost.metadata.measured_state).toBe('MEASURED');
      expect(cost.metadata.is_cost_evidence_measured).toBe(true);
      expect(cost.metadata.measured_provider_total).toBe(97.15);
      expect(cost.total_estimate).toBe(97.15);
    });

    it('7. unknown Stripe remains excluded', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            railway: { amount: 192, allocation_model: 'shared_unallocated' },
            supabase: { amount: 0, plan: 'free_tier', source_type: 'provider_billing', provided_by: 'admin', evidence_reference: 'attestation:sb' },
            stripe: { source_type: 'fee_structure_estimate' }, // unknown amount
            resend: { amount: 0, plan: 'free_tier', source_type: 'provider_billing', provided_by: 'admin', evidence_reference: 'attestation:rs' }
          }
        });
      expect(res.status).toBe(200);
      const meta = res.body.cost.metadata;
      expect(meta.unknown_amount_providers).toContain('stripe');
      expect(meta.providers.stripe.amount).toBeNull();
      expect(meta.total_is_partial).toBe(true);
      expect(res.body.cost.total_estimate).toBeNull();
    });

    it('8. Supabase/Resend measured zero contribute correctly as zero', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            supabase: {
              amount: 0,
              plan: 'free_tier',
              source_type: 'provider_billing',
              provided_by: 'admin',
              evidence_reference: 'attestation:supabase_free_tier',
              caveats: ['free tier active']
            },
            resend: {
              amount: 0,
              plan: 'free_tier',
              source_type: 'provider_billing',
              provided_by: 'admin',
              evidence_reference: 'attestation:resend_free_tier',
              caveats: ['free tier active']
            }
          }
        });
      expect(res.status).toBe(200);
      const meta = res.body.cost.metadata;
      expect(meta.providers.supabase.measured_state).toBe('MEASURED');
      expect(meta.providers.supabase.amount).toBe(0);
      expect(meta.providers.resend.measured_state).toBe('MEASURED');
      expect(meta.providers.resend.amount).toBe(0);
      expect(meta.measured_provider_total).toBe(0);
    });

    it('9. February period boundary valid', async () => {
      expect(getMonthPeriodBounds('2026-02')).toEqual({ periodStart: '2026-02-01', periodEnd: '2026-02-28' });
      expect(getMonthPeriodBounds('2024-02')).toEqual({ periodStart: '2024-02-01', periodEnd: '2024-02-29' });

      // Non-leap year February (28 days)
      const resFeb = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-02' });
      expect(resFeb.status).toBe(200);
      expect(resFeb.body.cost.metadata.period_start).toBe('2026-02-01');
      expect(resFeb.body.cost.metadata.period_end).toBe('2026-02-28');
      expect(resFeb.body.cost.metadata.providers.railway.period_start).toBe('2026-02-01');
      expect(resFeb.body.cost.metadata.providers.railway.period_end).toBe('2026-02-28');

      // Leap year February (29 days)
      const resLeap = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2024-02' });
      expect(resLeap.status).toBe(200);
      expect(resLeap.body.cost.metadata.period_start).toBe('2024-02-01');
      expect(resLeap.body.cost.metadata.period_end).toBe('2024-02-29');
    });

    it('10. 30-day month boundary valid', async () => {
      expect(getMonthPeriodBounds('2026-04')).toEqual({ periodStart: '2026-04-01', periodEnd: '2026-04-30' });
      expect(getMonthPeriodBounds('2026-09')).toEqual({ periodStart: '2026-09-01', periodEnd: '2026-09-30' });

      const resApril = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-04' });
      expect(resApril.status).toBe(200);
      expect(resApril.body.cost.metadata.period_start).toBe('2026-04-01');
      expect(resApril.body.cost.metadata.period_end).toBe('2026-04-30');

      const resSept = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-09' });
      expect(resSept.status).toBe(200);
      expect(resSept.body.cost.metadata.period_start).toBe('2026-09-01');
      expect(resSept.body.cost.metadata.period_end).toBe('2026-09-30');
    });

    it('11. 31-day month boundary valid', async () => {
      expect(getMonthPeriodBounds('2026-01')).toEqual({ periodStart: '2026-01-01', periodEnd: '2026-01-31' });
      expect(getMonthPeriodBounds('2026-03')).toEqual({ periodStart: '2026-03-01', periodEnd: '2026-03-31' });

      const resJan = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-01' });
      expect(resJan.status).toBe(200);
      expect(resJan.body.cost.metadata.period_start).toBe('2026-01-01');
      expect(resJan.body.cost.metadata.period_end).toBe('2026-01-31');

      const resMarch = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ period: '2026-03' });
      expect(resMarch.status).toBe(200);
      expect(resMarch.body.cost.metadata.period_start).toBe('2026-03-01');
      expect(resMarch.body.cost.metadata.period_end).toBe('2026-03-31');
    });

    it('12. unsupported Resend quota text absent', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            resend: {
              amount: 0,
              plan: 'free_tier',
              source_type: 'provider_billing',
              provided_by: 'admin',
              evidence_reference: 'attestation:resend_free_tier'
            }
          }
        });
      expect(res.status).toBe(200);
      const resend = res.body.cost.metadata.providers.resend;
      const allCaveatsStr = (resend.caveats || []).concat(res.body.cost.metadata.caveats || []).join(' ');
      expect(allCaveatsStr).not.toMatch(/3[,.]000/);
      expect(allCaveatsStr).not.toMatch(/emails\/month/i);
      expect(resend.caveats).toContain('Free tier plan active with 0 MXN baseline cost.');
    });

    it('13. isCostEvidenceMeasured behavior unchanged', async () => {
      // 3 measured, 1 partial -> false
      const partialCostRow = {
        id: 'cost-partial-row',
        cost_key: 'monthly_operating_cost_baseline',
        total_estimate: null,
        metadata: {
          calculation_version: 'pl20-03a-v1',
          measured_at: new Date().toISOString(),
          measured_state: 'PARTIAL',
          source: 'api_final_scale_operating_costs_run',
          providers: {
            railway: { measured_state: 'PARTIAL' },
            supabase: { measured_state: 'MEASURED' },
            stripe: { measured_state: 'MEASURED' },
            resend: { measured_state: 'MEASURED' }
          }
        }
      };
      customMockTableRows['operating_cost_summaries'] = [partialCostRow];

      const resPartial = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resPartial.status).toBe(200);
      expect(resPartial.body.summary.evaluationRules.isCostEvidenceMeasured).toBe(false);

      // All 4 measured -> true
      const measuredCostRow = {
        id: 'cost-measured-row',
        cost_key: 'monthly_operating_cost_baseline',
        total_estimate: 97.15,
        metadata: {
          calculation_version: 'pl20-03a-v1',
          measured_at: new Date().toISOString(),
          measured_state: 'MEASURED',
          source: 'api_final_scale_operating_costs_run',
          providers: {
            railway: { measured_state: 'MEASURED' },
            supabase: { measured_state: 'MEASURED' },
            stripe: { measured_state: 'MEASURED' },
            resend: { measured_state: 'MEASURED' }
          }
        }
      };
      customMockTableRows['operating_cost_summaries'] = [measuredCostRow];

      const resMeasured = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resMeasured.status).toBe(200);
      expect(resMeasured.body.summary.evaluationRules.isCostEvidenceMeasured).toBe(true);
    });

    it('14. finalScaleReady remains false', async () => {
      // Even if operating costs are all MEASURED, finalScaleReady must remain false
      // because isCapacityLoadMeasured remains false (load test proof is required)
      const measuredCostRow = {
        id: 'cost-all-measured-row',
        cost_key: 'monthly_operating_cost_baseline',
        total_estimate: 97.15,
        metadata: {
          calculation_version: 'pl20-03a-v1',
          measured_at: new Date().toISOString(),
          measured_state: 'MEASURED',
          source: 'api_final_scale_operating_costs_run',
          providers: {
            railway: { measured_state: 'MEASURED' },
            supabase: { measured_state: 'MEASURED' },
            stripe: { measured_state: 'MEASURED' },
            resend: { measured_state: 'MEASURED' }
          }
        }
      };
      customMockTableRows['operating_cost_summaries'] = [measuredCostRow];

      const summaryRes = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.summary.evaluationRules.isCostEvidenceMeasured).toBe(true);
      expect(summaryRes.body.summary.evaluationRules.isCapacityLoadMeasured).toBe(false);
      expect(summaryRes.body.summary.finalScaleReady).toBe(false);
      expect(summaryRes.body.summary.evaluationRules.finalScaleReady).toBe(false);
    });

    it('15. zero without provenance is NOT_MEASURED/PARTIAL', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            supabase: {
              amount: 0,
              source_type: 'manual_input'
              // missing free_tier plan, caveats, evidence_reference
            }
          }
        });
      expect(res.status).toBe(200);
      const supabase = res.body.cost.metadata.providers.supabase;
      expect(supabase.measured_state).not.toBe('MEASURED');
      expect(supabase.measured_state).toBe('PARTIAL');
    });

    it('16. Stripe fee structure alone remains PARTIAL', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            stripe: {
              source_type: 'fee_structure_estimate',
              caveats: ['known fee structure approx 2.9% with conditional 6 MXN fixed fee']
            }
          }
        });
      expect(res.status).toBe(200);
      const stripe = res.body.cost.metadata.providers.stripe;
      expect(stripe.measured_state).toBe('PARTIAL');
    });

    it('17. Stripe actual provider evidence can become MEASURED', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          providers: {
            stripe: {
              amount: 89.5,
              currency: 'MXN',
              source_type: 'provider_export',
              evidence_reference: 'export:stripe_monthly_fees_sep2026.csv',
              period_start: '2026-09-01',
              period_end: '2026-09-30'
            }
          }
        });
      expect(res.status).toBe(200);
      const stripe = res.body.cost.metadata.providers.stripe;
      expect(stripe.measured_state).toBe('MEASURED');
      expect(stripe.amount).toBe(89.5);
    });

    it('12. capacity remains false without actual load evidence', async () => {
      const capRes = await request(app)
        .post('/api/admin/final-scale/capacity/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(capRes.status).toBe(200);

      customMockTableRows['scale_capacity_assessments'] = capRes.body.capacity;
      const summaryRes = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.summary.evaluationRules.isCapacityLoadMeasured).toBe(false);
      expect(summaryRes.body.summary.evaluationRules.CAPACITY_BASELINE_MEASURED).toBe(false);
      expect(summaryRes.body.summary.evaluationRules.CAPACITY_SCALE_MEASURED).toBe(false);
    });

    it('13. PL20-02 request-body trust boundary does not regress', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ciEvidence: {
            technical_release_gate: {
              status: 'pass',
              run_id: '35423993132',
              workflow_identity: 'Selfcare Quality Gate',
              evidence_reference: 'run:35423993132'
            }
          }
        });
      expect(res.status).toBe(200);
      const gate = res.body.assessments.find((a: any) => a.assessment_key === 'technical_release_gate');
      expect(gate.metadata.source_classification).toBe('MANUAL_EVIDENCE');
      expect(gate.metadata.origin).toBe('request_body');
    });

    it('14. finalScaleReady remains false under current operational facts', async () => {
      const res = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.finalScaleReady).toBe(false);
    });
  });

  describe('POST-LAUNCH 20 (PL20-03B): Trusted CI Artifacts and Reviewed Security Evidence', () => {
    const validCommit = '77fef0eb2923751bd1f515187604343276948dba';
    const adminToken = authToken('admin');

    it('1. E2E PASS impossible without real E2E job success', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Quality Gate',
        workflow_run_id: 12345,
        workflow_attempt: 1,
        event: 'push',
        head_sha: validCommit,
        dimension: 'e2e',
        status: 'PASS',
        test_command: 'npm run test:e2e',
        browser: 'chromium',
        base_url: 'http://localhost:3000',
        server_command: 'npm run start',
        external_services: 'mocked_or_not_required'
      };

      // Real GitHub metadata has e2e job failed
      const fakeFailedRun: any = {
        id: 12345,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'failure',
        job_conclusions: { quality: 'success', e2e: 'failure' }
      };

      const result = verifyE2eImport({
        manifest,
        gitHubRun: fakeFailedRun,
        evaluatedCommitSha: validCommit,
        artifactName: 'pl20-evidence-e2e-12345-1'
      });

      expect(result.success).toBe(true);
      expect(result.record.status).toBe('FAIL');
    });

    it('2. fake artifact JSON alone rejected', async () => {
      const invalidManifest: any = {
        schema_version: 'pl20-invalid-version',
        repository: 'risejoaquin/stable-ecomerce'
      };
      const run: any = {
        id: 123,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success'
      };
      const result = verifyQualityGateImport({
        manifest: invalidManifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Schema invalid');
    });

    it('3. wrong repository rejected', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'evil/attacker-repo',
        workflow_name: 'Selfcare Quality Gate',
        workflow_run_id: 123,
        workflow_attempt: 1,
        event: 'push',
        head_sha: validCommit,
        dimensions: {}
      };
      const run: any = {
        id: 123,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'evil/attacker-repo',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success'
      };
      const result = verifyQualityGateImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wrong repository rejected');
    });

    it('4. wrong workflow rejected', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Fake Workflow',
        workflow_run_id: 123,
        workflow_attempt: 1,
        event: 'push',
        head_sha: validCommit,
        dimensions: {}
      };
      const run: any = {
        id: 123,
        attempt: 1,
        workflow_name: 'Fake Workflow',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success'
      };
      const result = verifyQualityGateImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wrong workflow rejected');
    });

    it('5. wrong run ID rejected', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Quality Gate',
        workflow_run_id: 111,
        workflow_attempt: 1,
        event: 'push',
        head_sha: validCommit,
        dimensions: {}
      };
      const run: any = {
        id: 222,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success'
      };
      const result = verifyQualityGateImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wrong run ID rejected');
    });

    it('6. wrong attempt rejected', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Quality Gate',
        workflow_run_id: 123,
        workflow_attempt: 1,
        event: 'push',
        head_sha: validCommit,
        dimensions: {}
      };
      const run: any = {
        id: 123,
        attempt: 2,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success'
      };
      const result = verifyQualityGateImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wrong attempt rejected');
    });

    it('7. wrong SHA rejected', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Quality Gate',
        workflow_run_id: 123,
        workflow_attempt: 1,
        event: 'push',
        head_sha: 'sha-aaa',
        dimensions: {}
      };
      const run: any = {
        id: 123,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: 'sha-bbb',
        event: 'push',
        conclusion: 'success'
      };
      const result = verifyQualityGateImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Wrong SHA rejected');
    });

    it('8. failed job cannot manifest as PASS', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Quality Gate',
        workflow_run_id: 123,
        workflow_attempt: 1,
        event: 'push',
        head_sha: validCommit,
        dimensions: {
          build: { status: 'PASS', step_name: 'Build' },
          unit_tests: { status: 'PASS', step_name: 'Unit tests' }
        }
      };
      const run: any = {
        id: 123,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'failure',
        step_conclusions: { build: 'failure', unit_tests: 'success' }
      };
      const result = verifyQualityGateImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(true);
      expect(result.records!.build.status).toBe('FAIL');
      expect(result.records!.release_gate.status).toBe('FAIL');
    });

    it('9. stale run cannot satisfy current commit', async () => {
      const oldCommit = '0000000000000000000000000000000000000000';
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Quality Gate',
        workflow_run_id: 123,
        workflow_attempt: 1,
        event: 'push',
        head_sha: oldCommit,
        dimensions: {
          build: { status: 'PASS' }
        }
      };
      const run: any = {
        id: 123,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: oldCommit,
        event: 'push',
        conclusion: 'success'
      };
      const result = verifyQualityGateImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit // newer evaluated commit
      });
      expect(result.success).toBe(true);
      expect(result.records!.build.status).toBe('STALE');
      expect(result.records!.release_gate.status).toBe('STALE');
    });

    it('10. duplicate import is idempotent', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Quality Gate',
        workflow_run_id: 999,
        workflow_attempt: 1,
        event: 'push',
        head_sha: validCommit,
        dimensions: {
          build: { status: 'PASS' }
        }
      };
      const run: any = {
        id: 999,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success'
      };
      const res1 = verifyQualityGateImport({ manifest, gitHubRun: run, evaluatedCommitSha: validCommit });
      const res2 = verifyQualityGateImport({ manifest, gitHubRun: run, evaluatedCommitSha: validCommit });
      expect(res1.records!.build.idempotency_key).toBe(res2.records!.build.idempotency_key);
      expect(res1.records!.build.idempotency_key).toBe(`build:999:1:${validCommit}`);
    });

    it('11. request-body VERIFIED_CI still downgraded', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/technical-assessment/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ciEvidence: {
            build: {
              status: 'pass',
              validated_commit_sha: validCommit,
              measured_at: new Date().toISOString(),
              evidence_reference: 'run:123',
              workflow_identity: 'Selfcare Quality Gate',
              source_classification: 'VERIFIED_CI_EVIDENCE',
              origin: 'persisted_trusted_import' // Spoof attempt in body
            }
          }
        });
      expect(res.status).toBe(200);
      const buildDim = res.body.assessments.find((a: any) => a.assessment_key === 'technical_build');
      expect(buildDim.source_classification).toBe('MANUAL_EVIDENCE');
      expect(buildDim.origin).toBe('request_body');
    });

    it('12. production smoke expected/deployed mismatch rejected', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Production Smoke',
        workflow_run_id: 555,
        workflow_attempt: 1,
        event: 'deployment_status',
        expected_commit: 'commit-aaa',
        deployed_commit: 'commit-bbb', // Mismatch!
        target_url: 'https://selfcaresinners.com',
        conclusion: 'success',
        validation_result: 'PASS',
        measured_at: new Date().toISOString()
      };
      const run: any = {
        id: 555,
        attempt: 1,
        workflow_name: 'Selfcare Production Smoke',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: 'commit-aaa',
        event: 'deployment_status',
        conclusion: 'success'
      };
      const result = verifyProductionSmokeImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: 'commit-aaa'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('mismatch rejected');
    });

    it('13. skipped smoke cannot PASS', async () => {
      const manifest: any = {
        schema_version: 'pl20-ci-evidence-v1',
        repository: 'risejoaquin/stable-ecomerce',
        workflow_name: 'Selfcare Production Smoke',
        workflow_run_id: 556,
        workflow_attempt: 1,
        event: 'deployment_status',
        expected_commit: validCommit,
        deployed_commit: validCommit,
        target_url: 'https://selfcaresinners.com',
        conclusion: 'skipped',
        validation_result: 'PASS',
        measured_at: new Date().toISOString()
      };
      const run: any = {
        id: 556,
        attempt: 1,
        workflow_name: 'Selfcare Production Smoke',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'deployment_status',
        conclusion: 'skipped'
      };
      const result = verifyProductionSmokeImport({
        manifest,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Skipped smoke cannot PASS');
    });

    it('14. reviewed security request-body spoof rejected', async () => {
      const manifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: validCommit,
        reviewed_at: new Date().toISOString(),
        reviewer_class: 'codex', // Unauthorized caller class!
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ],
        critical_open_count: 0,
        high_open_count: 0,
        status: 'PASS'
      };
      const result = verifyReviewedSecurityManifestInput({
        manifest,
        evaluatedCommitSha: validCommit,
        callerClass: 'codex'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized reviewer class');
    });

    it('15. missing reviewed security => security blockers NOT_MEASURED', async () => {
      customMockTableRows['final_technical_assessments'] = [];
      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${validCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.evaluationRules.technicalDimensions.security_blockers.status).toBe('NOT_MEASURED');
      expect(res.body.summary.evaluationRules.technicalDimensions.security_blockers.open_count).toBeNull();
    });

    it('16. critical_open_count > 0 => FAIL', async () => {
      const manifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: validCommit,
        reviewed_at: new Date().toISOString(),
        reviewer_class: 'chatgpt_web',
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ],
        critical_open_count: 2, // Critical finding open!
        high_open_count: 0,
        status: 'FAIL'
      };
      const result = verifyReviewedSecurityManifestInput({
        manifest,
        evaluatedCommitSha: validCommit,
        callerClass: 'chatgpt_web'
      });
      expect(result.success).toBe(true);
      expect(result.record.status).toBe('FAIL');
      expect(result.record.open_count).toBe(2);
    });

    it('17. zero blockers with current complete review can PASS', async () => {
      const manifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: validCommit,
        reviewed_at: new Date().toISOString(),
        reviewer_class: 'chatgpt_web',
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ],
        critical_open_count: 0,
        high_open_count: 0,
        status: 'PASS'
      };
      const result = verifyReviewedSecurityManifestInput({
        manifest,
        evaluatedCommitSha: validCommit,
        callerClass: 'chatgpt_web'
      });
      expect(result.success).toBe(true);
      expect(result.record.status).toBe('PASS');
      expect(result.record.open_count).toBe(0);
      expect(result.record.origin).toBe('reviewed_security');
      expect(result.record.source_classification).toBe('REVIEWED_SECURITY_EVIDENCE');
    });

    it('18. unreviewed HIGH => PARTIAL', async () => {
      const manifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: validCommit,
        reviewed_at: new Date().toISOString(),
        reviewer_class: 'chatgpt_web',
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'UNREVIEWED' }, // unreviewed!
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ],
        critical_open_count: 0,
        high_open_count: 1, // High vulnerability not reviewed/mitigated!
        known_exceptions: [],
        caveats: [],
        status: 'PARTIAL'
      };
      const result = verifyReviewedSecurityManifestInput({
        manifest,
        evaluatedCommitSha: validCommit,
        callerClass: 'chatgpt_web'
      });
      expect(result.success).toBe(true);
      expect(result.record.status).toBe('PARTIAL');
    });

    const createTrustedPassingAssessments = (commitSha: string) => {
      const keys = [
        'technical_release_gate',
        'technical_production_smoke',
        'technical_build',
        'technical_unit_tests',
        'technical_e2e',
        'technical_secret_scan',
        'technical_database_reproducibility',
        'technical_security_blockers'
      ];
      const measuredAt = new Date().toISOString();
      return keys.map((k, idx) => {
        const isDb = k === 'technical_database_reproducibility';
        const isSec = k === 'technical_security_blockers';
        const isE2e = k === 'technical_e2e';
        const classification = isDb ? 'PERSISTED_EVIDENCE' : (isSec ? 'REVIEWED_SECURITY_EVIDENCE' : 'VERIFIED_CI_EVIDENCE');
        const origin = isDb
          ? 'persisted_database_evidence'
          : (isSec ? 'reviewed_security' : 'persisted_trusted_import');
        const workflowIdentity = isE2e ? 'Selfcare Quality Gate / e2e' : (k === 'technical_production_smoke' ? 'Selfcare Production Smoke' : 'Selfcare Quality Gate');

        return {
          id: `pl20-03b-tech-${idx + 1}`,
          assessment_key: k,
          status: 'pass',
          score: null,
          origin,
          source_classification: classification,
          open_count: isSec ? 0 : undefined,
          reviewer_class: isSec ? 'chatgpt_web' : undefined,
          reviewed_at: isSec ? measuredAt : undefined,
          metadata: {
            source: isSec ? 'security_audit' : 'github_actions_ci',
            source_type: isDb ? 'migration_history' : (isSec ? 'security_audit' : 'ci_pipeline'),
            source_classification: classification,
            origin,
            calculation_version: 'pl20-ci-evidence-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED',
            validated_commit_sha: commitSha,
            evidence_reference: `run:3542280042${idx}`,
            workflow_identity: workflowIdentity,
            open_count: isSec ? 0 : undefined,
            reviewer_class: isSec ? 'chatgpt_web' : undefined,
            reviewed_at: isSec ? measuredAt : undefined
          },
          evidence: {
            validated_commit_sha: commitSha,
            source_classification: classification,
            origin,
            evidence_reference: `run:3542280042${idx}`,
            workflow_identity: workflowIdentity,
            measured_at: measuredAt,
            open_count: isSec ? 0 : undefined,
            reviewer_class: isSec ? 'chatgpt_web' : undefined,
            reviewed_at: isSec ? measuredAt : undefined
          }
        };
      });
    };

    it('19. PL20-02 trust boundary unchanged', async () => {
      // Direct insertion of a row claiming VERIFIED_CI_EVIDENCE without trusted origin must be downgraded by summary
      const measuredAt = new Date().toISOString();
      customMockTableRows['final_technical_assessments'] = [
        {
          id: 'claim-untrusted-1',
          assessment_key: 'technical_build',
          area: 'build',
          status: 'pass',
          score: null,
          source_classification: 'VERIFIED_CI_EVIDENCE',
          origin: 'request_body', // not persisted_trusted_import!
          metadata: {
            source: 'github_actions_ci',
            source_type: 'ci_pipeline',
            source_classification: 'VERIFIED_CI_EVIDENCE',
            origin: 'request_body',
            calculation_version: 'pl20-ci-evidence-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED',
            validated_commit_sha: validCommit,
            evidence_reference: 'run:123',
            workflow_identity: 'Selfcare Quality Gate'
          },
          evidence: {
            source_classification: 'VERIFIED_CI_EVIDENCE',
            origin: 'request_body',
            validated_commit_sha: validCommit,
            measured_at: measuredAt,
            evidence_reference: 'run:123',
            workflow_identity: 'Selfcare Quality Gate'
          }
        }
      ];
      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${validCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.evaluationRules.technicalDimensions.build.classification).toBe('MANUAL_EVIDENCE');
      expect(res.body.summary.evaluationRules.technicalRequiredPass).toBe(false);
    });

    it('20. finalScaleReady remains false unless all independent dimensions pass', async () => {
      // Even if all technical dimensions have mock trusted passes, operating costs are PARTIAL and capacity is false
      customMockTableRows['final_technical_assessments'] = createTrustedPassingAssessments(validCommit);

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${validCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.evaluationRules.technicalRequiredPass).toBe(true);
      // Operating costs and capacity are not scale-ready, so finalScaleReady MUST remain false!
      expect(res.body.summary.finalScaleReady).toBe(false);
    });
  });

  describe('POST-LAUNCH 20 (PL20-03B Final Hotfix): Release Gate Aggregation and Reviewed Security Authority', () => {
    const validCommit = '58255e9ac6ff1b54cc0530523d5f6d23207c22a4';
    const adminToken = authToken('admin');

    const baseAggregateManifest = {
      schema_version: 'pl20-ci-evidence-v1',
      repository: 'risejoaquin/stable-ecomerce',
      workflow_name: 'Selfcare Quality Gate',
      workflow_job: 'aggregate',
      aggregate: true,
      workflow_run_id: 1001,
      workflow_attempt: 1,
      event: 'push',
      head_sha: validCommit,
      completed_at: new Date().toISOString(),
      dimensions: {
        build: { status: 'PASS' },
        unit_tests: { status: 'PASS' },
        secret_scan: { status: 'PASS' },
        core_regression: { status: 'PASS' },
        security_baseline: { status: 'PASS' },
        e2e: { status: 'PASS' }
      }
    };

    it('1. quality PASS + e2e FAIL => release_gate FAIL', () => {
      const manifest = {
        ...baseAggregateManifest,
        dimensions: {
          ...baseAggregateManifest.dimensions,
          e2e: { status: 'FAIL' }
        }
      };
      const run: any = {
        id: 1001,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'failure',
        job_conclusions: {
          quality: 'success',
          e2e: 'failure'
        }
      };
      const result = verifyQualityGateImport({
        manifest: manifest as any,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(true);
      expect(result.records!.release_gate.status).toBe('FAIL');
      expect(result.records!.e2e.status).toBe('FAIL');
    });

    it('2. quality PASS + e2e skipped => release_gate not PASS (NOT_MEASURED)', () => {
      const manifest = {
        ...baseAggregateManifest,
        dimensions: {
          ...baseAggregateManifest.dimensions,
          e2e: { status: 'NOT_MEASURED' }
        }
      };
      const run: any = {
        id: 1001,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success',
        job_conclusions: {
          quality: 'success',
          e2e: 'skipped'
        }
      };
      const result = verifyQualityGateImport({
        manifest: manifest as any,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(true);
      expect(result.records!.release_gate.status).toBe('NOT_MEASURED');
      expect(result.records!.release_gate.status).not.toBe('PASS');
      expect(result.records!.e2e.status).toBe('NOT_MEASURED');
    });

    it('3. quality PASS + e2e PASS => release_gate PASS', () => {
      const run: any = {
        id: 1001,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success',
        job_conclusions: {
          quality: 'success',
          e2e: 'success'
        }
      };
      const result = verifyQualityGateImport({
        manifest: baseAggregateManifest as any,
        gitHubRun: run,
        evaluatedCommitSha: validCommit
      });
      expect(result.success).toBe(true);
      expect(result.records!.release_gate.status).toBe('PASS');
      expect(result.records!.e2e.status).toBe('PASS');
      expect(result.records!.build.status).toBe('PASS');
    });

    it('4. final aggregate manifest generated after both jobs', () => {
      const run: any = {
        id: 1001,
        attempt: 1,
        workflow_name: 'Selfcare Quality Gate',
        repository: 'risejoaquin/stable-ecomerce',
        head_sha: validCommit,
        event: 'push',
        conclusion: 'success',
        job_conclusions: {
          quality: 'success',
          e2e: 'success',
          aggregate: 'success'
        }
      };
      const result = verifyQualityGateImport({
        manifest: baseAggregateManifest as any,
        gitHubRun: run,
        evaluatedCommitSha: validCommit,
        artifactName: 'pl20-evidence-quality-gate-1001-1'
      });
      expect(result.success).toBe(true);
      expect(result.records!.release_gate).toBeDefined();
      expect(result.records!.release_gate.manifest_path).toBe('pl20-evidence/quality-gate.json');
      expect(result.records!.release_gate.artifact_name).toBe('pl20-evidence-quality-gate-1001-1');
      expect(result.records!.e2e).toBeDefined();
      expect(result.records!.build).toBeDefined();
      expect(result.records!.unit_tests).toBeDefined();
    });

    it('5. stale reviewed-security SHA rejected', () => {
      const manifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: '77fef0eb2923751bd1f515187604343276948dba', // Stale SHA
        reviewed_at: new Date().toISOString(),
        reviewer_class: 'chatgpt_web',
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ],
        critical_open_count: 0,
        high_open_count: 0,
        status: 'PASS'
      };
      const result = verifyReviewedSecurityManifestInput({
        manifest,
        evaluatedCommitSha: validCommit, // newer commit
        callerClass: 'chatgpt_web'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Stale reviewed-security SHA rejected');
    });

    it('6. draft security candidate cannot satisfy security block', async () => {
      const candidateManifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        candidate: true,
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: validCommit,
        prepared_at: new Date().toISOString(),
        status: 'PREPARED_FOR_REVIEW',
        reviewer_class: null,
        critical_open_count: 0,
        high_open_count: 1,
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ]
      };

      // Import verification must reject candidate draft from satisfying reviewed security
      const verifyResult = verifyReviewedSecurityManifestInput({
        manifest: candidateManifest,
        evaluatedCommitSha: validCommit
      });
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.error).toContain('Draft security candidate cannot satisfy security blockers');

      // Candidate helper prepares candidate record as NOT_MEASURED / CANDIDATE_EVIDENCE
      const candidatePrep = verifySecurityReviewCandidate({
        manifest: candidateManifest,
        evaluatedCommitSha: validCommit
      });
      expect(candidatePrep.success).toBe(true);
      expect(candidatePrep.record.status).toBe('NOT_MEASURED');
      expect(candidatePrep.record.source_classification).toBe('CANDIDATE_EVIDENCE');

      // In summary endpoint, draft candidate row must NEVER satisfy security blockers
      customMockTableRows['final_technical_assessments'] = [
        {
          id: 'candidate-draft-1',
          assessment_key: 'technical_security_blockers',
          area: 'security',
          status: 'PREPARED_FOR_REVIEW',
          score: null,
          source_classification: 'CANDIDATE_EVIDENCE',
          origin: 'security_review_candidate',
          candidate: true,
          open_count: 0,
          metadata: {
            source: 'security_audit',
            source_type: 'security_candidate',
            calculation_version: 'pl20-reviewed-security-v1',
            measured_state: 'MEASURED',
            measured_at: new Date().toISOString(),
            candidate: true,
            status: 'PREPARED_FOR_REVIEW',
            source_classification: 'CANDIDATE_EVIDENCE',
            origin: 'security_review_candidate',
            validated_commit_sha: validCommit
          },
          evidence: {
            candidate: true,
            status: 'PREPARED_FOR_REVIEW',
            validated_commit_sha: validCommit,
            source: 'security_audit',
            calculation_version: 'pl20-reviewed-security-v1',
            measured_state: 'MEASURED',
            measured_at: new Date().toISOString()
          }
        }
      ];
      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${validCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.evaluationRules.technicalDimensions.security_blockers.status).toBe('NOT_MEASURED');
      expect(res.body.summary.evaluationRules.technicalDimensions.security_blockers.classification).toBe('MANUAL_EVIDENCE');
      expect(res.body.summary.evaluationRules.technicalRequiredPass).toBe(false);
    });

    it('7. Antigravity-created candidate cannot impersonate chatgpt_web review', () => {
      const spoofedManifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: validCommit,
        reviewed_at: new Date().toISOString(),
        reviewer_class: 'chatgpt_web',
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ],
        critical_open_count: 0,
        high_open_count: 0,
        status: 'PASS'
      };
      const result = verifyReviewedSecurityManifestInput({
        manifest: spoofedManifest,
        evaluatedCommitSha: validCommit,
        callerClass: 'antigravity'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("Antigravity/agent caller cannot self-issue or impersonate reviewer_class 'chatgpt_web'");
    });

    it('8. missing reviewer cannot PASS', () => {
      const missingReviewerManifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: validCommit,
        reviewed_at: new Date().toISOString(),
        reviewer_class: null,
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ],
        critical_open_count: 0,
        high_open_count: 0,
        status: 'PASS'
      };
      const result = verifyReviewedSecurityManifestInput({
        manifest: missingReviewerManifest,
        evaluatedCommitSha: validCommit,
        callerClass: 'chatgpt_web'
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing reviewer cannot PASS');
    });

    it('9. current authorized reviewed manifest can PASS', () => {
      const authorizedManifest: any = {
        schema_version: 'pl20-reviewed-security-v1',
        repository: 'risejoaquin/stable-ecomerce',
        validated_commit_sha: validCommit,
        reviewed_at: new Date().toISOString(),
        reviewer_class: 'chatgpt_web',
        scope: { included: ['secret_scan', 'security_baseline', 'core_regression', 'known_issues', 'dependency_vulnerabilities', 'pl20_trust_boundary'] },
        sources: [
          { source_type: 'secret_scan', reference: 'ref', status: 'PASS' },
          { source_type: 'security_baseline', reference: 'ref', status: 'PASS' },
          { source_type: 'core_regression', reference: 'ref', status: 'PASS' },
          { source_type: 'known_issues', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'dependency_vulnerabilities', reference: 'ref', status: 'REVIEWED' },
          { source_type: 'pl20_trust_boundary', reference: 'ref', status: 'REVIEWED' }
        ],
        critical_open_count: 0,
        high_open_count: 0,
        status: 'PASS'
      };
      const result = verifyReviewedSecurityManifestInput({
        manifest: authorizedManifest,
        evaluatedCommitSha: validCommit,
        callerClass: 'chatgpt_web'
      });
      expect(result.success).toBe(true);
      expect(result.record.status).toBe('PASS');
      expect(result.record.origin).toBe('reviewed_security');
      expect(result.record.source_classification).toBe('REVIEWED_SECURITY_EVIDENCE');
      expect(result.record.reviewer_class).toBe('chatgpt_web');
    });

    it('10. PL20-02 trust boundary remains intact', async () => {
      // Direct insertion claiming VERIFIED_CI_EVIDENCE or REVIEWED_SECURITY_EVIDENCE with untrusted origin is downgraded
      const measuredAt = new Date().toISOString();
      customMockTableRows['final_technical_assessments'] = [
        {
          id: 'claim-untrusted-boundary',
          assessment_key: 'technical_release_gate',
          area: 'release_gate',
          status: 'pass',
          score: null,
          source_classification: 'VERIFIED_CI_EVIDENCE',
          origin: 'untrusted_body',
          metadata: {
            source: 'github_actions_ci',
            source_type: 'ci_pipeline',
            calculation_version: 'pl20-ci-evidence-v1',
            measured_state: 'MEASURED',
            source_classification: 'VERIFIED_CI_EVIDENCE',
            origin: 'untrusted_body',
            validated_commit_sha: validCommit,
            measured_at: measuredAt,
            evidence_reference: 'run:123',
            workflow_identity: 'Selfcare Quality Gate'
          },
          evidence: {
            source_classification: 'VERIFIED_CI_EVIDENCE',
            origin: 'untrusted_body',
            validated_commit_sha: validCommit,
            measured_at: measuredAt,
            evidence_reference: 'run:123',
            workflow_identity: 'Selfcare Quality Gate'
          }
        }
      ];
      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${validCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.evaluationRules.technicalDimensions.release_gate.classification).toBe('MANUAL_EVIDENCE');
      expect(res.body.summary.evaluationRules.technicalRequiredPass).toBe(false);
    });

    it('11. finalScaleReady remains false', async () => {
      // Even if all 8 technical assessments are present and passed with trusted classifications,
      // commercial capacity and operating costs prevent finalScaleReady from becoming true
      const keys = [
        'technical_release_gate',
        'technical_production_smoke',
        'technical_build',
        'technical_unit_tests',
        'technical_e2e',
        'technical_secret_scan',
        'technical_database_reproducibility',
        'technical_security_blockers'
      ];
      const measuredAt = new Date().toISOString();
      customMockTableRows['final_technical_assessments'] = keys.map((k, idx) => {
        const isDb = k === 'technical_database_reproducibility';
        const isSec = k === 'technical_security_blockers';
        const isE2e = k === 'technical_e2e';
        const classification = isDb ? 'PERSISTED_EVIDENCE' : (isSec ? 'REVIEWED_SECURITY_EVIDENCE' : 'VERIFIED_CI_EVIDENCE');
        const origin = isDb ? 'persisted_database_evidence' : (isSec ? 'reviewed_security' : 'persisted_trusted_import');
        const workflowIdentity = isE2e ? 'Selfcare Quality Gate / e2e' : (k === 'technical_production_smoke' ? 'Selfcare Production Smoke' : 'Selfcare Quality Gate');
        return {
          id: `trusted-pass-${idx}`,
          assessment_key: k,
          status: 'pass',
          score: null,
          origin,
          source_classification: classification,
          open_count: isSec ? 0 : undefined,
          reviewer_class: isSec ? 'chatgpt_web' : undefined,
          reviewed_at: isSec ? measuredAt : undefined,
          metadata: {
            source: isSec ? 'security_audit' : 'github_actions_ci',
            source_type: isDb ? 'migration_history' : (isSec ? 'security_audit' : 'ci_pipeline'),
            source_classification: classification,
            origin,
            validated_commit_sha: validCommit,
            measured_at: measuredAt,
            measured_state: 'MEASURED',
            calculation_version: 'pl20-ci-evidence-v1',
            workflow_identity: workflowIdentity,
            evidence_reference: `ref-${idx}`,
            open_count: isSec ? 0 : undefined,
            reviewer_class: isSec ? 'chatgpt_web' : undefined,
            reviewed_at: isSec ? measuredAt : undefined
          },
          evidence: {
            source_classification: classification,
            origin,
            validated_commit_sha: validCommit,
            measured_at: measuredAt,
            workflow_identity: workflowIdentity,
            evidence_reference: `ref-${idx}`,
            open_count: isSec ? 0 : undefined,
            reviewer_class: isSec ? 'chatgpt_web' : undefined,
            reviewed_at: isSec ? measuredAt : undefined
          }
        };
      });

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${validCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.evaluationRules.technicalRequiredPass).toBe(true);
      expect(res.body.summary.finalScaleReady).toBe(false);
    });
  });
});
