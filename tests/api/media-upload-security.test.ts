// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import sharp from 'sharp';

const secret = 'ccp18-local-test-secret-only';
const storage = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ error: null })),
  getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://storage.invalid/test-image' } })),
  remove: vi.fn(async () => ({ error: null })),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => ({ storage: { from: () => storage } }) }));
let app: Awaited<ReturnType<typeof import('../../server').startServer>>;
const routes = ['/api/upload', '/api/upload/product-image'];
const token = (role: string) => jwt.sign({ userId: `ccp18-${role}`, role }, secret, { expiresIn: '10m' });

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LOG_LEVEL', 'silent');
  vi.stubEnv('JWT_SECRET', secret);
  vi.stubEnv('SUPABASE_URL', 'https://storage.invalid');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'ccp18-test-placeholder');
  for (const key of ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'SENTRY_DSN', 'VITE_SENTRY_DSN']) vi.stubEnv(key, '');
  vi.stubEnv('ABANDONED_CART_RECOVERY_DISABLED', 'true');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('External network is forbidden in CCP-18 tests'); }));
  app = await (await import('../../server')).startServer({ listen: false });
});
afterAll(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('CCP-18 upload security', () => {
  for (const route of routes) {
    it(`${route}: missing authentication -> 401 before multipart processing`, async () => {
      const response = await request(app).post(route).attach('file', Buffer.from('<svg/>'), { filename: 'test.svg', contentType: 'image/svg+xml' });
      expect(response.status).toBe(401);
    });
    it(`${route}: non-admin -> 403 before multipart processing`, async () => {
      const response = await request(app).post(route).set('Authorization', `Bearer ${token('user')}`).attach('file', Buffer.from('<svg/>'), { filename: 'test.svg', contentType: 'image/svg+xml' });
      expect(response.status).toBe(403);
    });
    for (const format of ['jpeg', 'png', 'webp'] as const) {
      it(`${route}: permits ${format}`, async () => {
        const buffer = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).toFormat(format).toBuffer();
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', buffer, { filename: `test.${format}`, contentType: `image/${format}` });
        expect(response.status).toBe(route === '/api/upload' ? 200 : 201);
      });
    }
    for (const [filename, contentType] of [['test.svg', 'image/svg+xml'], ['test.html', 'text/html'], ['test.js', 'application/javascript'], ['test.exe', 'application/octet-stream'], ['test.avif', 'image/avif']]) {
      it(`${route}: rejects ${contentType} -> 400`, async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', Buffer.from('forbidden test content'), { filename, contentType });
        expect(response.status, JSON.stringify(response.body)).toBe(400);
      });
    }
    it(`${route}: rejects >5MB -> 413`, async () => {
      const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' });
      expect(response.status, JSON.stringify(response.body)).toBe(413);
    });
  }
});
