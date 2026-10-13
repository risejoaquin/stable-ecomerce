// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';

let app: Awaited<ReturnType<typeof import('../../server').startServer>>;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'data-deletion-test-secret';
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.SUPABASE_ANON_KEY = '';
  process.env.STRIPE_SECRET_KEY = 'sk_test_data_deletion_contract_only';
  process.env.DATA_DELETION_REQUEST_INTAKE_ENABLED = 'false';
  const server = await import('../../server');
  app = await server.startServer({ listen: false });
}, 30000);

describe('POST /api/privacy/data-deletion-request', () => {
  it('accepts a manual review request without echoing PII or deleting data (stored: false by default)', async () => {
    const response = await request(app)
      .post('/api/privacy/data-deletion-request')
      .send({
        email: 'customer@example.com',
        orderReference: 'ORDER-123',
        requestTypes: ['account', 'orders', 'meta_events'],
        details: 'Please review my data.'
      });

    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      status: 'accepted_for_manual_review',
      automatedDeletion: false,
      stored: false
    });
    expect(response.body.requestId).toBeTruthy();
    expect(typeof response.body.requestId).toBe('string');
    expect(response.body.nextStep).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain('customer@example.com');
    expect(JSON.stringify(response.body)).not.toContain('ORDER-123');
    expect(JSON.stringify(response.body)).not.toContain('Please review my data.');
  });

  it('rejects invalid email payload with sanitized 400', async () => {
    const response = await request(app)
      .post('/api/privacy/data-deletion-request')
      .send({
        email: 'not-an-email',
        requestTypes: ['account']
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_data_deletion_request');
    expect(response.body.message).toBe('Invalid data deletion request payload.');
    expect(response.body.stack).toBeUndefined();
  });

  it('rejects unapproved request types', async () => {
    const response = await request(app)
      .post('/api/privacy/data-deletion-request')
      .send({
        email: 'customer@example.com',
        requestTypes: ['delete_everything_now']
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_data_deletion_request');
    expect(response.body.stack).toBeUndefined();
  });

  it('rejects empty requestTypes array', async () => {
    const response = await request(app)
      .post('/api/privacy/data-deletion-request')
      .send({
        email: 'customer@example.com',
        requestTypes: []
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_data_deletion_request');
  });

  it('rejects request missing email completely and enforces rate limit headers', async () => {
    const response = await request(app)
      .post('/api/privacy/data-deletion-request')
      .send({
        requestTypes: ['account']
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_data_deletion_request');
    expect(response.headers['ratelimit-limit']).toBe('5');
    expect(response.headers['ratelimit-remaining']).toBe('0');
  });

  it('enforces 429 Too Many Requests when rate limit max (5) is exceeded', async () => {
    const response = await request(app)
      .post('/api/privacy/data-deletion-request')
      .send({
        email: 'ratelimit-test@example.com',
        requestTypes: ['account']
      });

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect(response.body.error).toBe('Too many data deletion requests, please try again later.');
  });
});
