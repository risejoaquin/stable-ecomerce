// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import request from 'supertest';

const testSecret = 'pl20-sec-hotfix-test-secret-key-32chars!!';

describe('PL20-03P / SEC-HOTFIX-01 - Minimal Security Closure Hotfix Tests', () => {
  const serverTsPath = path.resolve(__dirname, '../../server.ts');
  const serverTsContent = fs.readFileSync(serverTsPath, 'utf-8');

  let app: any;
  let originalFetch: typeof globalThis.fetch;
  let mockCarts: Record<string, any> = {};

  function makeToken(payload: object, expiresIn: any = '1h') {
    return jwt.sign(payload, testSecret, { expiresIn } as any);
  }

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = testSecret;
    process.env.SUPABASE_URL = 'https://mock-qa.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
    process.env.SUPABASE_ANON_KEY = 'mock-anon-key';

    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url || '';
      const headers = init?.headers;
      let accept = '';
      if (headers) {
        if (typeof headers.get === 'function') accept = headers.get('accept') || headers.get('Accept') || '';
        else if (typeof headers === 'object') accept = (headers as any).accept || (headers as any).Accept || '';
      }
      const isSingle = accept.includes('vnd.pgrst.object+json');

      if (url.includes('/users')) {
        // Handle update
        return new Response(JSON.stringify({ id: 'user-123', email: 'verified@example.com', is_verified: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.includes('/stores')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body || '{}');
          const row = Array.isArray(body) ? body[0] : body;
          return new Response(JSON.stringify(row), {
            status: 200,
            headers: { 'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json' }
          });
        }
      }

      if (url.includes('/orders')) {
        if (url.includes('valid-order-123')) {
          const order = {
            id: 'valid-order-123',
            status: 'enviado',
            created_at: '2026-09-20T10:00:00Z',
            tracking_number: 'TRK-987654',
            tracking_url: 'https://carrier.com/track/TRK-987654',
            carrier: 'DHL',
            total: 2500,
            currency: 'MXN',
            customer_email: 'trackme@example.com',
            // Sensitive fields that MUST NOT be exposed in public response
            stripe_session_id: 'cs_live_secret_123',
            stripe_payment_intent_id: 'pi_secret_456',
            stripe_refund_id: 're_secret_789',
            payout_reference: 'po_secret_000',
            financial_status: 'paid',
            accounting_notes: 'Internal cost $1200',
            customer_user_id: 'user-uuid-999',
            store_id: 'store-uuid-001',
            customer_phone: '+525512345678',
            shipping_address: { street: 'Main St 123', city: 'CDMX' },
            billing_address: { street: 'Tax St 456', city: 'CDMX' },
            notes: 'Secret VIP customer notes',
            order_items: [
              {
                id: 'item-1',
                quantity: 2,
                unit_price: 1250,
                cost_price: 500, // sensitive internal field
                supplier_sku: 'SUP-SECRET-1', // sensitive
                product_snapshot: { name: 'Serum Glow', cost: 400 },
                products: { name: 'Serum Glow', images: ['https://example.com/serum.jpg'] }
              }
            ]
          };
          return new Response(JSON.stringify(isSingle ? order : [order]), {
            status: 200,
            headers: { 'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          code: 'PGRST116',
          details: 'Results contain 0 rows',
          message: 'JSON object requested, multiple (or no) rows returned'
        }), {
          status: 406,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.includes('/order_timeline')) {
        return new Response(JSON.stringify([
          {
            id: 'timeline-1',
            event_type: 'status_changed',
            from_status: 'pendiente',
            to_status: 'enviado',
            created_at: '2026-09-20T12:00:00Z',
            actor_id: 'internal-admin-42', // sensitive internal actor
            internal_note: 'Dispatched from warehouse B' // sensitive
          }
        ]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if (url.includes('/abandoned_carts')) {
        if (init?.method === 'POST') {
          const body = JSON.parse(init.body || '{}');
          const row = Array.isArray(body) ? body[0] : body;
          const id = 'cart-' + Math.random().toString(36).slice(2, 9);
          mockCarts[id] = { id, reminder_sent: false, ...row };
          return new Response(JSON.stringify(mockCarts[id]), {
            status: 200,
            headers: { 'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json' }
          });
        }
        if (init?.method === 'PATCH' || init?.method === 'PUT') {
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        // GET / select
        if (url.includes('victim%40example.com') || url.includes('victim@example.com')) {
          const cart = {
            id: 'cart-victim-1',
            email: 'victim@example.com',
            user_id: null,
            reminder_sent: true,
            items: [{ id: 'item-victim-1', quantity: 1, unit_price: 500 }]
          };
          return new Response(JSON.stringify(isSingle ? cart : [cart]), {
            status: 200,
            headers: { 'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json' }
          });
        }
        if (url.includes('existing%40example.com') || url.includes('existing@example.com')) {
          const cart = {
            id: 'cart-existing-1',
            email: 'existing@example.com',
            user_id: null,
            reminder_sent: false,
            items: [{ id: 'item-orig-1', quantity: 1, unit_price: 300 }]
          };
          return new Response(JSON.stringify(isSingle ? cart : [cart]), {
            status: 200,
            headers: { 'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json' }
          });
        }
        if (url.includes('auth-user-999')) {
          const cart = {
            id: 'cart-user-999',
            email: 'authuser@example.com',
            user_id: 'auth-user-999',
            reminder_sent: false,
            items: [{ id: 'item-orig-1', quantity: 1, unit_price: 300 }]
          };
          return new Response(JSON.stringify(isSingle ? cart : [cart]), {
            status: 200,
            headers: { 'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json' }
          });
        }
        // not found
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
        headers: { 'Content-Type': 'application/json' }
      });
    };

    const serverModule = await import('../../server.js');
    app = await serverModule.startServer({ listen: false });
  });

  afterAll(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  // ==========================================================================
  // SEC-004: VERIFY EMAIL RESPONSE REDACTION
  // ==========================================================================
  describe('SEC-004 - verify-email response redaction', () => {
    it('ensures server.ts does not call .select() on /api/verify-email', () => {
      const verifyEmailBlock = serverTsContent.slice(
        serverTsContent.indexOf("app.post('/api/verify-email'"),
        serverTsContent.indexOf("app.post('/api/resend-verification'")
      );
      expect(verifyEmailBlock).not.toContain(".select()");
      expect(verifyEmailBlock).not.toContain("user: data");
    });

    it('rejects missing token with 400', async () => {
      const res = await request(app).post('/api/verify-email').send({});
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: 'Token is required' });
    });

    it('rejects invalid or expired token with 400', async () => {
      const res = await request(app).post('/api/verify-email').send({ token: 'invalid-jwt-token' });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: 'Invalid or expired token' });
    });

    it('rejects token with wrong purpose with 400', async () => {
      const wrongPurposeToken = makeToken({ userId: 'u1', purpose: 'password_reset' });
      const res = await request(app).post('/api/verify-email').send({ token: wrongPurposeToken });
      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ error: 'Invalid token purpose' });
    });

    it('returns success and strictly redacts user database row', async () => {
      const validToken = makeToken({ userId: 'u1', purpose: 'email_verification' });
      const res = await request(app).post('/api/verify-email').send({ token: validToken });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true, message: 'Email verified' });

      // Strict assertions: must contain no user property or sensitive fields
      expect(res.body.user).toBeUndefined();
      expect(res.body.password_hash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
      expect(res.body.verification_token).toBeUndefined();
      expect(res.body.role).toBeUndefined();
      expect(res.body.shipping_address).toBeUndefined();
      expect(res.body.billing_address).toBeUndefined();
      expect(res.body.phone).toBeUndefined();
    });
  });

  // ==========================================================================
  // SEC-007: PUBLIC LOG ERROR HARDENING
  // ==========================================================================
  describe('SEC-007 - public log error hardening', () => {
    it('ensures no appendFileSync exists on /api/log-error route', () => {
      const logErrorBlock = serverTsContent.slice(
        serverTsContent.indexOf("app.post('/api/log-error'"),
        serverTsContent.indexOf("app.get('/api/health'")
      );
      expect(logErrorBlock).not.toContain("appendFileSync");
      expect(logErrorBlock).not.toContain("frontend-error.log");
      expect(logErrorBlock).toContain("logger.warn");
    });

    it('accepts valid bounded error payload and returns { ok: true }', async () => {
      const res = await request(app).post('/api/log-error').send({ error: 'Uncaught component render error' });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    });

    it('rejects invalid error types (objects, numbers, booleans, null)', async () => {
      const res1 = await request(app).post('/api/log-error').send({ error: 12345 });
      expect(res1.status).toBe(400);
      expect(res1.body.error).toContain('Invalid error payload');

      const res2 = await request(app).post('/api/log-error').send({ error: { nested: 'bad' } });
      expect(res2.status).toBe(400);

      const res3 = await request(app).post('/api/log-error').send({});
      expect(res3.status).toBe(400);
    });

    it('bounds and handles long error strings without echoing input', async () => {
      const longString = 'A'.repeat(5000);
      const res = await request(app).post('/api/log-error').send({ error: longString });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(res.text).not.toContain(longString);
    });

    it('rejects oversized bodies (> 10kb)', async () => {
      const hugeString = 'X'.repeat(25000);
      const res = await request(app)
        .post('/api/log-error')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ error: hugeString }));
      expect([400, 413]).toContain(res.status);
    });
  });

  // ==========================================================================
  // SEC-013: STORE CREATION ADMIN AUTHORIZATION
  // ==========================================================================
  describe('SEC-013 - store creation admin authorization', () => {
    it('ensures server.ts requires requireAdmin() on /api/stores', () => {
      const storesDef = serverTsContent.slice(
        serverTsContent.indexOf("app.post('/api/stores'"),
        serverTsContent.indexOf("app.post('/api/stores'") + 80
      );
      expect(storesDef).toContain("requireAuth()");
      expect(storesDef).toContain("requireAdmin()");
    });

    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).post('/api/stores').send({ name: 'Rogue Store' });
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ error: 'Unauthorized' });
    });

    it('rejects normal customer (role user/customer) with 403', async () => {
      const customerToken = makeToken({ userId: 'cust-1', role: 'customer' });
      const res = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ name: 'Rogue Store' });
      expect(res.status).toBe(403);
      expect(res.body).toMatchObject({ error: 'Admin access required' });
    });

    it('allows admin and guarantees owner_user_id cannot be spoofed', async () => {
      const adminToken = makeToken({ userId: 'admin-real-id', role: 'admin' });
      const res = await request(app)
        .post('/api/stores')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Brand Line', owner_user_id: 'spoofed-attacker-id' });
      expect(res.status).toBe(200);
      // owner_user_id must be admin-real-id, never the spoofed id
      expect(res.body.owner_user_id).toBe('admin-real-id');
    });
  });

  // ==========================================================================
  // SEC-014: PUBLIC ORDER TRACKING DTO
  // ==========================================================================
  describe('SEC-014 - public order tracking safe DTO', () => {
    it('rejects missing parameters with 400', async () => {
      const res1 = await request(app).get('/api/orders/track');
      expect(res1.status).toBe(400);

      const res2 = await request(app).get('/api/orders/track?email=test@example.com');
      expect(res2.status).toBe(400);

      const res3 = await request(app).get('/api/orders/track?order_id=valid-order-123');
      expect(res3.status).toBe(400);
    });

    it('returns 404 for mismatched email or order id', async () => {
      const res1 = await request(app).get('/api/orders/track?email=wrong@example.com&order_id=valid-order-123');
      expect(res1.status).toBe(404);

      const res2 = await request(app).get('/api/orders/track?email=trackme@example.com&order_id=nonexistent-order');
      expect(res2.status).toBe(404);
    });

    it('returns strictly sanitized safe DTO and redacts sensitive data recursively', async () => {
      const res = await request(app).get('/api/orders/track?email=trackme@example.com&order_id=valid-order-123');
      expect(res.status).toBe(200);

      // Allowed fields
      expect(res.body).toMatchObject({
        id: 'valid-order-123',
        status: 'enviado',
        created_at: '2026-09-20T10:00:00Z',
        tracking_number: 'TRK-987654',
        tracking_url: 'https://carrier.com/track/TRK-987654',
        carrier: 'DHL',
        total: 2500,
        currency: 'MXN'
      });

      // Allowed items
      expect(Array.isArray(res.body.order_items)).toBe(true);
      expect(res.body.order_items[0]).toMatchObject({
        id: 'item-1',
        quantity: 2,
        unit_price: 1250,
        products: {
          name: 'Serum Glow',
          images: ['https://example.com/serum.jpg']
        }
      });

      // Allowed timeline
      expect(Array.isArray(res.body.timeline)).toBe(true);
      expect(res.body.timeline[0]).toMatchObject({
        id: 'timeline-1',
        event_type: 'status_changed',
        from_status: 'pendiente',
        to_status: 'enviado',
        created_at: '2026-09-20T12:00:00Z'
      });

      // Recursive check: sensitive fields MUST NOT be present anywhere in response body
      const serialized = JSON.stringify(res.body);
      expect(serialized).not.toContain('cs_live_secret_123');
      expect(serialized).not.toContain('pi_secret_456');
      expect(serialized).not.toContain('re_secret_789');
      expect(serialized).not.toContain('po_secret_000');
      expect(serialized).not.toContain('Internal cost');
      expect(serialized).not.toContain('Secret VIP customer notes');
      expect(serialized).not.toContain('Main St 123');
      expect(serialized).not.toContain('Tax St 456');
      expect(serialized).not.toContain('+525512345678');
      expect(serialized).not.toContain('user-uuid-999');
      expect(serialized).not.toContain('store-uuid-001');
      expect(serialized).not.toContain('SUP-SECRET-1');
      expect(serialized).not.toContain('internal-admin-42');
      expect(serialized).not.toContain('Dispatched from warehouse B');

      expect(res.body.stripe_session_id).toBeUndefined();
      expect(res.body.stripe_payment_intent_id).toBeUndefined();
      expect(res.body.stripe_refund_id).toBeUndefined();
      expect(res.body.financial_status).toBeUndefined();
      expect(res.body.shipping_address).toBeUndefined();
      expect(res.body.billing_address).toBeUndefined();
      expect(res.body.customer_phone).toBeUndefined();
      expect(res.body.notes).toBeUndefined();
      expect(res.body.order_items[0].cost_price).toBeUndefined();
      expect(res.body.order_items[0].supplier_sku).toBeUndefined();
      expect(res.body.timeline[0].actor_id).toBeUndefined();
      expect(res.body.timeline[0].internal_note).toBeUndefined();
    });
  });

  // ==========================================================================
  // SEC-016: GUEST CART OWNERSHIP
  // ==========================================================================
  describe('SEC-016 - guest cart ownership and abuse prevention', () => {
    it('mints signed guestCartToken on initial guest cart sync', async () => {
      const res = await request(app).post('/api/cart/sync').send({
        email: 'newguest@example.com',
        items: [{ id: 'prod-1', quantity: 2 }]
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.guestCartToken).toBe('string');

      const decoded: any = jwt.verify(res.body.guestCartToken, testSecret);
      expect(decoded.purpose).toBe('guest_cart');
      expect(decoded.email).toBe('newguest@example.com');
    });

    it('rejects unauthenticated attacker trying to overwrite existing victim cart without token with 403', async () => {
      const res = await request(app).post('/api/cart/sync').send({
        email: 'victim@example.com',
        items: [{ id: 'malicious-item', quantity: 99 }]
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('guestCartToken');
    });

    it('rejects invalid or forged guestCartToken with 403', async () => {
      const res = await request(app).post('/api/cart/sync').send({
        email: 'victim@example.com',
        items: [{ id: 'item-1', quantity: 1 }],
        guestCartToken: 'invalid.forged.jwt'
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('rejects token for email A when attempting to mutate email B with 403', async () => {
      const tokenForA = makeToken({ email: 'attacker@example.com', purpose: 'guest_cart' });
      const res = await request(app).post('/api/cart/sync').send({
        email: 'victim@example.com',
        items: [{ id: 'item-1', quantity: 1 }],
        guestCartToken: tokenForA
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('mismatch');
    });

    it('rejects expired guestCartToken with 403', async () => {
      const expiredToken = jwt.sign(
        { email: 'existing@example.com', purpose: 'guest_cart' },
        testSecret,
        { expiresIn: '-1s' } as any
      );
      const res = await request(app).post('/api/cart/sync').send({
        email: 'existing@example.com',
        items: [{ id: 'item-1', quantity: 1 }],
        guestCartToken: expiredToken
      });
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Invalid or expired');
    });

    it('allows valid token to update own guest cart', async () => {
      const validToken = makeToken({ email: 'existing@example.com', purpose: 'guest_cart' });
      const res = await request(app).post('/api/cart/sync').send({
        email: 'existing@example.com',
        items: [{ id: 'item-1', quantity: 3 }],
        guestCartToken: validToken
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.guestCartToken).toBe(validToken);
    });

    it('allows authenticated user to update their own cart without guestCartToken', async () => {
      const userToken = makeToken({ userId: 'auth-user-999', role: 'customer' });
      const res = await request(app)
        .post('/api/cart/sync')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          email: 'authuser@example.com',
          items: [{ id: 'item-auth-1', quantity: 1 }]
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('enforces payload item limits and schema', async () => {
      // Empty items
      const res1 = await request(app).post('/api/cart/sync').send({
        email: 'test@example.com',
        items: []
      });
      expect(res1.status).toBe(400);

      // Over 50 items
      const hugeItems = Array.from({ length: 51 }, (_, i) => ({ id: `p-${i}`, quantity: 1 }));
      const res2 = await request(app).post('/api/cart/sync').send({
        email: 'test@example.com',
        items: hugeItems
      });
      expect(res2.status).toBe(400);

      // Missing item id
      const res3 = await request(app).post('/api/cart/sync').send({
        email: 'test@example.com',
        items: [{ quantity: 1 }]
      });
      expect(res3.status).toBe(400);

      // Invalid quantity
      const res4 = await request(app).post('/api/cart/sync').send({
        email: 'test@example.com',
        items: [{ id: 'p1', quantity: -5 }]
      });
      expect(res4.status).toBe(400);
    });

    it('ensures guest sync does not reset reminder_sent or recovery_lock in code', () => {
      const cartSyncBlock = serverTsContent.slice(
        serverTsContent.indexOf("app.post('/api/cart/sync'"),
        serverTsContent.indexOf("app.get('/api/cart/recover'")
      );
      // The insecure code previously had: reminder_sent: false, reminder_sent_at: null, recovery_lock_id: null
      expect(cartSyncBlock).not.toContain("reminder_sent: false");
      expect(cartSyncBlock).not.toContain("reminder_sent_at: null");
      expect(cartSyncBlock).not.toContain("recovery_lock_id: null");
    });
  });
});
