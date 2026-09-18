// @vitest-environment node
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

const testSecret = 'qa-release-e-test-secret';
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;

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
        calculationVersion: 'pl20-01-hotfix-real-contract',
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

    it('10. operating costs sets measured_state: MEASURED when all four provider estimates are supplied', async () => {
      const adminToken = authToken('admin');
      const res = await request(app)
        .post('/api/admin/final-scale/operating-costs/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          period: '2026-09',
          railwayEstimate: 20,
          supabaseEstimate: 50,
          stripeEstimate: 15,
          emailEstimate: 5
        });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');

      const cost = res.body.costs[0];
      expect(cost.total_estimate).toBe(90);
      expect(cost.metadata.measured_state).toBe('MEASURED');
      expect(cost.metadata.has_explicit_estimates).toBe(true);
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
  });
});
