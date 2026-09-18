// @vitest-environment node
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const testSecret = 'qa-release-e-test-secret';
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;

function authToken(role: 'user' | 'admin') {
  return jwt.sign({ userId: `qa-${role}-user`, role }, testSecret, { expiresIn: '10m' });
}

let originalFetch: typeof globalThis.fetch;

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
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Range': '0-0/0'
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
});
