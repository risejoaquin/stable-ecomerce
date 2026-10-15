// @vitest-environment node
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

let app: Awaited<ReturnType<typeof import('../../server').startServer>>;
let serverModule: typeof import('../../server');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'data-deletion-test-secret';
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.SUPABASE_ANON_KEY = '';
  process.env.STRIPE_SECRET_KEY = 'sk_test_data_deletion_contract_only';
  process.env.RESEND_API_KEY = '';
  process.env.EMAIL_ALLOW_MOCKS = 'true';
  process.env.DATA_DELETION_REQUEST_INTAKE_ENABLED = 'true';
  serverModule = await import('../../server');
}, 30000);

beforeEach(async () => {
  process.env.NODE_ENV = 'test';
  process.env.EMAIL_ALLOW_MOCKS = 'true';
  process.env.DATA_DELETION_REQUEST_INTAKE_ENABLED = 'true';
  app = await serverModule.startServer({ listen: false });
});

describe('POST /api/privacy/data-deletion-request', () => {
  it('returns 202 only after controlled intake delivery is confirmed', async () => {
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
      accepted: true,
      automatedDeletion: false,
      deliveryStatus: 'mocked'
    });
    expect(response.body.requestId).toBeTruthy();
    expect(typeof response.body.requestId).toBe('string');
    expect(response.body.nextStep).toBeTruthy();
    expect(JSON.stringify(response.body)).not.toContain('customer@example.com');
    expect(JSON.stringify(response.body)).not.toContain('ORDER-123');
    expect(JSON.stringify(response.body)).not.toContain('Please review my data.');
  });

  it('returns sanitized 503 and no success folio when intake is disabled', async () => {
    process.env.DATA_DELETION_REQUEST_INTAKE_ENABLED = 'false';

    const response = await request(app)
      .post('/api/privacy/data-deletion-request')
      .send({
        email: 'customer@example.com',
        requestTypes: ['account']
      });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('data_deletion_intake_unavailable');
    expect(response.body.requestId).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('customer@example.com');
  });

  it('returns sanitized 503 when the configured manual intake cannot deliver', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_ALLOW_MOCKS = 'false';

    const response = await request(app)
      .post('/api/privacy/data-deletion-request')
      .send({
        email: 'customer@example.com',
        requestTypes: ['account']
      });

    expect(response.status).toBe(503);
    expect(response.body.error).toBe('data_deletion_intake_unavailable');
    expect(response.body.requestId).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toContain('customer@example.com');
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

  it('enforces 429 Too Many Requests when rate limit max (5) is exceeded', async () => {
    let response;
    for (let index = 0; index < 6; index += 1) {
      response = await request(app)
        .post('/api/privacy/data-deletion-request')
        .send({
          email: `ratelimit-${index}@example.com`,
          requestTypes: ['account']
        });
    }

    expect(response?.status).toBe(429);
    expect(response?.headers['retry-after']).toBeDefined();
    expect(response?.body.error).toBe('Too many data deletion requests, please try again later.');
  });
});
