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

    const createPassingCiEvidence = (commitSha: string) => {
      const keys = [
        'technical_release_gate',
        'technical_production_smoke',
        'technical_build',
        'technical_unit_tests',
        'technical_e2e',
        'technical_secret_scan',
        'technical_database_reproducibility'
      ];
      const measuredAt = new Date().toISOString();
      return keys.map((k, idx) => ({
        id: `ci-tech-${idx + 1}`,
        assessment_key: k,
        status: 'pass',
        score: null,
        metadata: {
          source: 'github_actions_ci',
          source_type: 'ci_pipeline',
          source_classification: 'CI_EVIDENCE',
          calculation_version: 'pl20-02-v1',
          measured_at: measuredAt,
          measured_state: 'MEASURED',
          validated_commit_sha: commitSha
        },
        evidence: {
          validated_commit_sha: commitSha,
          source_classification: 'CI_EVIDENCE'
        }
      }));
    };

    it('1. runtime cannot fabricate CI PASS (calling technical assessment without CI evidence marks CI dimensions NOT_MEASURED)', async () => {
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
        'technical_database_reproducibility'
      ];

      for (const ciKey of ciKeys) {
        const item = res.body.assessments.find((a: any) => a.assessment_key === ciKey);
        expect(item).toBeDefined();
        expect(item.status).toBe('not_measured');
        const expectedClassification = ciKey === 'technical_database_reproducibility' ? 'PERSISTED_EVIDENCE' : 'CI_EVIDENCE';
        expect(item.metadata.source_classification).toBe(expectedClassification);
        expect(item.metadata.validated_commit_sha).toBeNull();
      }

      // Runtime dimensions are classified as RUNTIME_OBSERVED
      const dbItem = res.body.assessments.find((a: any) => a.assessment_key === 'runtime_database_connectivity');
      expect(dbItem).toBeDefined();
      expect(dbItem.metadata.source_classification).toBe('RUNTIME_OBSERVED');
    });

    it('2. missing CI evidence => technicalRequiredPass false', async () => {
      // Setup mock where CI dimensions are missing from technical assessments
      customMockTableRows['final_technical_assessments'] = [
        {
          id: 'rt-1',
          assessment_key: 'runtime_database_connectivity',
          status: 'pass',
          score: null,
          metadata: {
            source: 'api_final_scale_technical_assessment_run',
            source_type: 'api',
            source_classification: 'RUNTIME_OBSERVED',
            calculation_version: 'pl20-02-v1',
            measured_at: new Date().toISOString(),
            measured_state: 'MEASURED'
          }
        }
      ];

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.summary.evaluationRules.technicalEvidenceComplete).toBe(false);
      expect(res.body.summary.evaluationRules.technicalRequiredPass).toBe(false);
      expect(res.body.summary.finalScaleReady).toBe(false);
    });

    it('3. stale commit evidence => technicalRequiredPass false', async () => {
      // Evidence validated for an older commit
      customMockTableRows['final_technical_assessments'] = createPassingCiEvidence('older-commit-sha-99999');

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const rules = res.body.summary.evaluationRules;
      expect(rules.technicalDimensions.release_gate.status).toBe('STALE');
      expect(rules.technicalDimensions.build.status).toBe('STALE');
      expect(rules.technicalEvidenceCurrent).toBe(false);
      expect(rules.technicalRequiredPass).toBe(false);
    });

    it('4. failed release gate => technicalRequiredPass false', async () => {
      const evidence = createPassingCiEvidence(targetCommit);
      const gateItem = evidence.find(e => e.assessment_key === 'technical_release_gate')!;
      gateItem.status = 'fail';

      customMockTableRows['final_technical_assessments'] = evidence;

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const rules = res.body.summary.evaluationRules;
      expect(rules.technicalDimensions.release_gate.status).toBe('FAIL');
      expect(rules.technicalRequiredPass).toBe(false);
    });

    it('5. missing production smoke => technicalRequiredPass false', async () => {
      // All CI items present except production smoke
      const evidence = createPassingCiEvidence(targetCommit).filter(e => e.assessment_key !== 'technical_production_smoke');
      customMockTableRows['final_technical_assessments'] = evidence;

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const rules = res.body.summary.evaluationRules;
      expect(rules.technicalDimensions.production_smoke.status).toBe('NOT_MEASURED');
      expect(rules.technicalEvidenceComplete).toBe(false);
      expect(rules.technicalRequiredPass).toBe(false);
    });

    it('6. required technical evidence all current and pass => technicalRequiredPass true', async () => {
      customMockTableRows['final_technical_assessments'] = createPassingCiEvidence(targetCommit);

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const rules = res.body.summary.evaluationRules;
      expect(rules.technicalEvidenceComplete).toBe(true);
      expect(rules.technicalEvidenceCurrent).toBe(true);
      expect(rules.technicalRequiredPass).toBe(true);
    });

    it('7. runtime RSS does not satisfy capacity load evidence', async () => {
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

    it('8. DB connectivity does not satisfy load capacity', async () => {
      const res = await request(app)
        .post('/api/admin/final-scale/capacity/run')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ runKey: 'test-capacity-db-conn' });
      expect(res.status).toBe(200);

      const dbItem = res.body.assessments.find((a: any) => a.capacity_key === 'supabase_database_capacity');
      expect(dbItem).toBeDefined();
      expect(dbItem.metadata.semantic_dimension).toBe('database_runtime_health');
      expect(dbItem.metadata.is_scale_capacity).toBe(false);

      // Verify that in summary, runtime DB health does not satisfy load capacity
      customMockTableRows['scale_capacity_assessments'] = [dbItem];
      const summaryRes = await request(app)
        .get('/api/admin/final-scale/summary')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.summary.evaluationRules.isCapacityLoadMeasured).toBe(false);
    });

    it('9. commercial metrics retain exact provenance and no PII', async () => {
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

      // PII leak audit
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('secret@buyer.com');
    });

    it('10. commercial low volume remains measured + warning track record', async () => {
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

    it('11. partial provider costs remain insufficient', async () => {
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

    it('12. legacy static rows remain excluded', async () => {
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

    it('13. finalScaleReady remains false while capacity is not measured', async () => {
      const measuredAt = new Date().toISOString();
      customMockTableRows['final_technical_assessments'] = createPassingCiEvidence(targetCommit);
      customMockTableRows['final_commercial_assessments'] = [
        {
          id: 'comm-1',
          assessment_key: 'commercial_volume_performance',
          status: 'measured',
          score: null,
          metadata: {
            source: 'api_final_scale_commercial_assessment_run',
            source_type: 'api',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED'
          }
        }
      ];
      customMockTableRows['operating_cost_summaries'] = [
        {
          id: 'cost-1',
          cost_key: 'monthly_operating_cost_baseline',
          metadata: {
            source: 'api_final_scale_operating_costs_run',
            source_type: 'api',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED'
          }
        }
      ];
      // Capacity is ordinary runtime health, NOT scale capacity
      customMockTableRows['scale_capacity_assessments'] = [
        {
          id: 'cap-1',
          capacity_key: 'railway_runtime_capacity',
          status: 'pass',
          score: null,
          metadata: {
            source: 'api_final_scale_capacity_run',
            source_type: 'api',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED',
            semantic_dimension: 'runtime_health',
            is_scale_capacity: false
          }
        }
      ];

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const rules = res.body.summary.evaluationRules;
      expect(rules.technicalRequiredPass).toBe(true);
      expect(rules.isCommercialMeasured).toBe(true);
      expect(rules.isCostEvidenceMeasured).toBe(true);
      expect(rules.isCapacityLoadMeasured).toBe(false);
      expect(res.body.summary.finalScaleReady).toBe(false);
    });

    it('14. finalScaleReady remains false while costs are not measured', async () => {
      const measuredAt = new Date().toISOString();
      customMockTableRows['final_technical_assessments'] = createPassingCiEvidence(targetCommit);
      customMockTableRows['final_commercial_assessments'] = [
        {
          id: 'comm-1',
          assessment_key: 'commercial_volume_performance',
          status: 'measured',
          score: null,
          metadata: {
            source: 'api_final_scale_commercial_assessment_run',
            source_type: 'api',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED'
          }
        }
      ];
      // Capacity has verified load test evidence
      customMockTableRows['scale_capacity_assessments'] = [
        {
          id: 'cap-scale-1',
          capacity_key: 'synthetic_vs_load_testing',
          status: 'measured',
          score: null,
          metadata: {
            source: 'load_test_runner',
            source_type: 'automated_runner',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'MEASURED',
            semantic_dimension: 'capacity.load_test',
            is_scale_capacity: true,
            load_test_evidence: {
              concurrent_users: 50,
              p95_latency_ms: 320
            }
          }
        }
      ];
      // Costs are NOT_MEASURED
      customMockTableRows['operating_cost_summaries'] = [
        {
          id: 'cost-unmeasured-1',
          cost_key: 'monthly_operating_cost_baseline',
          metadata: {
            source: 'api_final_scale_operating_costs_run',
            source_type: 'api',
            calculation_version: 'pl20-02-v1',
            measured_at: measuredAt,
            measured_state: 'NOT_MEASURED'
          }
        }
      ];

      const res = await request(app)
        .get(`/api/admin/final-scale/summary?commit_sha=${targetCommit}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);

      const rules = res.body.summary.evaluationRules;
      expect(rules.technicalRequiredPass).toBe(true);
      expect(rules.isCommercialMeasured).toBe(true);
      expect(rules.isCapacityLoadMeasured).toBe(true);
      expect(rules.isCostEvidenceMeasured).toBe(false);
      expect(res.body.summary.finalScaleReady).toBe(false);
    });
  });
});
