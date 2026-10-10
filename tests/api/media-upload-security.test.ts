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
    for (const [name, filename, contentType, buffer] of [
      ['arbitrary binary', 'test.png', 'image/png', Buffer.from([0, 1, 2, 3])],
      ['disguised executable', 'test.png', 'image/png', Buffer.from('MZ executable')],
      ['invalid extension', 'test.exe', 'image/png', null],
      ['mismatched extension', 'test.jpg', 'image/png', null],
      ['invalid MIME', 'test.png', 'application/octet-stream', null],
      ['spoofed MIME', 'test.png', 'image/png', Buffer.from('<svg/>')],
      ['empty file', 'test.png', 'image/png', Buffer.alloc(0)],
      ['corrupt PNG', 'test.png', 'image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ] as const) {
      it(`${route}: rejects ${name} safely -> 400`, async () => {
        const payload = buffer ?? await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`)
          .attach('file', payload, { filename, contentType });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: contentType === 'application/octet-stream' && route === '/api/upload' ? 'Invalid upload input' : 'Invalid image file' });
      });
    }
    for (const code of ['LIMIT_UNEXPECTED_FILE', 'LIMIT_FILE_COUNT', 'LIMIT_FIELD_COUNT', 'LIMIT_PART_COUNT']) {
      it(`${route}: ${code} -> safe 400`, async () => {
        const payload = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
        const pending = request(app).post(route).set('Authorization', `Bearer ${token('admin')}`);
        if (code === 'LIMIT_FIELD_COUNT' || code === 'LIMIT_PART_COUNT') {
          for (let i = 0; i < (code === 'LIMIT_FIELD_COUNT' ? 9 : 8); i++) pending.field(`field${i}`, 'value');
        }
        pending.attach(code === 'LIMIT_UNEXPECTED_FILE' ? 'unexpected' : 'file', payload, { filename: 'test.png', contentType: 'image/png' });
        if (code === 'LIMIT_FILE_COUNT' || code === 'LIMIT_PART_COUNT') {
          pending.attach('file', payload, { filename: 'second.png', contentType: 'image/png' });
        }
        const response = await pending;
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Invalid upload input' });
      });
    }
    for (const contentType of ['multipart/form-data', 'multipart/form-data; boundary=test-boundary']) {
      it(`${route}: malformed ${contentType} -> safe 400`, async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`)
          .set('Content-Type', contentType).send('malformed multipart input');
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Invalid upload input' });
      });
    }
    it(`${route}: rejects >5MB -> 413`, async () => {
      const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' });
      expect(response.status, JSON.stringify(response.body)).toBe(413);
    });
  }
});
