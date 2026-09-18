// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

let app: Awaited<ReturnType<typeof import('../../server').startServer>>;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'qa-release-e-test-secret';
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.SUPABASE_ANON_KEY = '';
  process.env.STRIPE_SECRET_KEY = 'sk_test_qa_release_e_contract_only';
  const server = await import('../../server');
  app = await server.startServer({ listen: false });
}, 30000);

describe('GET /api/health', () => {
  it('uses the real application health route', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'selfcare-sinners-web',
      environment: 'test',
    });
    expect(response.body.requestId).toBeTruthy();
  });
});
