// @vitest-environment node
import jwt from 'jsonwebtoken';
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

const testSecret = 'qa-release-e-test-secret';
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;

function authToken(role: 'user' | 'admin') {
  return jwt.sign({ userId: `qa-${role}-user`, role }, testSecret, { expiresIn: '10m' });
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = testSecret;
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.SUPABASE_ANON_KEY = '';
  process.env.STRIPE_SECRET_KEY = 'sk_test_qa_release_e_contract_only';
  const server = await import('../../server');
  app = await server.startServer({ listen: false });
}, 30000);

describe('QA / RELEASE E API functional and quality contracts', () => {
  it('rejects invalid login without exposing a token', async () => {
    const response = await request(app)
      .post('/api/login')
      .send({ email: 'qa-invalid@example.test', password: 'wrong-password' });

    expect([401, 500]).toContain(response.status);
    expect(response.body.token).toBeUndefined();
  });

  it('denies guest access to customer order list', async () => {
    const response = await request(app).get('/api/orders/my');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('denies guest access to admin diagnostics', async () => {
    const response = await request(app).get('/api/admin/diagnostics');

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'Unauthorized' });
  });

  it('denies normal user access to an admin-only backend endpoint', async () => {
    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${authToken('user')}`);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'Admin access required' });
  });

  it('allows an admin token to pass authorization before upload payload validation', async () => {
    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${authToken('admin')}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/No file uploaded|Unexpected end of form/i);
  });

  it('rejects checkout requests with missing orderId before creating a payment session', async () => {
    const response = await request(app).post('/api/checkout').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'orderId is required' });
  });

  it('rejects authentication requests with missing credentials', async () => {
    const response = await request(app).post('/api/login').send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ error: 'Email and password required' });
  });
});
