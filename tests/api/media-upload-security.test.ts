// @vitest-environment node
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
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

let validPng: Buffer;
let validJpeg: Buffer;
let validWebp: Buffer;

beforeAll(async () => {
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('LOG_LEVEL', 'silent');
  vi.stubEnv('JWT_SECRET', secret);
  vi.stubEnv('SUPABASE_URL', 'https://storage.invalid');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'ccp18-test-placeholder');
  for (const key of ['STRIPE_SECRET_KEY', 'RESEND_API_KEY', 'SENTRY_DSN', 'VITE_SENTRY_DSN']) vi.stubEnv(key, '');
  vi.stubEnv('ABANDONED_CART_RECOVERY_DISABLED', 'true');
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('External network is forbidden in CCP-18 tests'); }));

  validPng = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } }).png().toBuffer();
  validJpeg = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } }).jpeg().toBuffer();
  validWebp = await sharp({ create: { width: 4, height: 4, channels: 3, background: '#ffffff' } }).webp().toBuffer();

  app = await (await import('../../server')).startServer({ listen: false });
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterAll(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('CCP-18 upload security', () => {
  for (const route of routes) {
    describe(`${route} authentication and authorization`, () => {
      it('missing authentication -> 401 before multipart processing', async () => {
        const response = await request(app).post(route).attach('file', Buffer.from('<svg/>'), { filename: 'test.svg', contentType: 'image/svg+xml' });
        expect(response.status).toBe(401);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('non-admin role ("user") -> 403 before multipart processing', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('user')}`).attach('file', Buffer.from('<svg/>'), { filename: 'test.svg', contentType: 'image/svg+xml' });
        expect(response.status).toBe(403);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('non-admin role ("support") -> 403 before multipart processing', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('support')}`).attach('file', validPng, { filename: 'test.png', contentType: 'image/png' });
        expect(response.status).toBe(403);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('owner role -> 403 (preserves existing admin-only boundary for media upload)', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('owner')}`).attach('file', validPng, { filename: 'test.png', contentType: 'image/png' });
        expect(response.status).toBe(403);
        expect(response.body).toEqual({ error: 'Admin access required' });
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('admin role -> permitted and authorized', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', validPng, { filename: 'test.png', contentType: 'image/png' });
        expect(response.status).toBe(route === '/api/upload' ? 200 : 201);
        expect(storage.upload).toHaveBeenCalled();
      });
    });

    describe(`${route} supported formats`, () => {
      for (const format of ['jpeg', 'png', 'webp'] as const) {
        it(`permits valid ${format}`, async () => {
          const buffer = format === 'jpeg' ? validJpeg : format === 'png' ? validPng : validWebp;
          const ext = format === 'jpeg' ? 'jpg' : format;
          const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', buffer, { filename: `test.${ext}`, contentType: `image/${format}` });
          expect(response.status).toBe(route === '/api/upload' ? 200 : 201);
          expect(response.body).toHaveProperty('url');
          expect(storage.upload).toHaveBeenCalled();
        });
      }
    });

    describe(`${route} Multer limits and error handling`, () => {
      it('rejects >5MB -> 413 (LIMIT_FILE_SIZE)', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', Buffer.alloc(5 * 1024 * 1024 + 1), { filename: 'large.png', contentType: 'image/png' });
        expect(response.status, JSON.stringify(response.body)).toBe(413);
        expect(response.body).toEqual({ error: 'File too large' });
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects unexpected file field name -> 400 (LIMIT_UNEXPECTED_FILE)', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('unexpected_field', validPng, { filename: 'test.png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Unexpected file field' });
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects multiple files on single file upload -> 400 (LIMIT_UNEXPECTED_FILE)', async () => {
        const response = await request(app)
          .post(route)
          .set('Authorization', `Bearer ${token('admin')}`)
          .attach('file', validPng, { filename: 'test1.png', contentType: 'image/png' })
          .attach('file', validPng, { filename: 'test2.png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects excessive form fields count (> 8 fields) -> 400 (LIMIT_FIELD_COUNT)', async () => {
        let req = request(app).post(route).set('Authorization', `Bearer ${token('admin')}`);
        for (let i = 0; i < 9; i++) {
          req = req.field(`custom_field_${i}`, `value_${i}`);
        }
        req = req.attach('file', validPng, { filename: 'test.png', contentType: 'image/png' });
        const response = await req;
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Too many form fields' });
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects excessive field key length (> 100 chars) -> 400 (LIMIT_FIELD_KEY)', async () => {
        const longKey = 'k'.repeat(101);
        const response = await request(app)
          .post(route)
          .set('Authorization', `Bearer ${token('admin')}`)
          .field(longKey, 'value')
          .attach('file', validPng, { filename: 'test.png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Field name too long' });
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects excessive field value size (> 64KB) -> 400 (LIMIT_FIELD_SIZE)', async () => {
        const largeValue = 'v'.repeat(65 * 1024);
        const response = await request(app)
          .post(route)
          .set('Authorization', `Bearer ${token('admin')}`)
          .field('large_field', largeValue)
          .attach('file', validPng, { filename: 'test.png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(response.body).toEqual({ error: 'Field value too large' });
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects excessive parts count (> 10 parts) -> 400 (LIMIT_PART_COUNT)', async () => {
        let req = request(app).post(route).set('Authorization', `Bearer ${token('admin')}`);
        for (let i = 0; i < 8; i++) {
          req = req.field(`part_${i}`, `val_${i}`);
        }
        // Total parts: 8 fields + 3 extra fields = 11 parts > 10 limit
        req = req.field('part_8', 'val_8').field('part_9', 'val_9').field('part_10', 'val_10');
        req = req.attach('file', validPng, { filename: 'test.png', contentType: 'image/png' });
        const response = await req;
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });
    });

    describe(`${route} malformed multipart requests`, () => {
      it('rejects multipart/form-data without boundary header -> 400', async () => {
        const response = await request(app)
          .post(route)
          .set('Authorization', `Bearer ${token('admin')}`)
          .set('Content-Type', 'multipart/form-data')
          .send('malformed body without boundary');
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects truncated / broken multipart payload -> 400', async () => {
        const boundary = '----WebKitFormBoundaryBrokenTest';
        const response = await request(app)
          .post(route)
          .set('Authorization', `Bearer ${token('admin')}`)
          .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
          .send(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n[incomplete data`);
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });
    });

    describe(`${route} content validation vs client MIME spoofing`, () => {
      for (const [filename, contentType] of [
        ['test.svg', 'image/svg+xml'],
        ['test.html', 'text/html'],
        ['test.js', 'application/javascript'],
        ['test.exe', 'application/octet-stream'],
        ['test.avif', 'image/avif']
      ]) {
        it(`rejects forbidden MIME type ${contentType} -> 400`, async () => {
          const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', Buffer.from('forbidden test content'), { filename, contentType });
          expect(response.status, JSON.stringify(response.body)).toBe(400);
          expect(storage.upload).not.toHaveBeenCalled();
        });
      }

      it('rejects client claiming image/png with SVG script payload -> 400', async () => {
        const svgScript = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script></svg>');
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', svgScript, { filename: 'avatar.png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects client claiming image/jpeg with PE binary executable payload -> 400', async () => {
        const fakeBinary = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff\x00\x00');
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', fakeBinary, { filename: 'photo.jpg', contentType: 'image/jpeg' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects client claiming image/webp with plain text payload -> 400', async () => {
        const plainText = Buffer.from('echo "not a webp image"');
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', plainText, { filename: 'banner.webp', contentType: 'image/webp' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects corrupted image buffer with valid magic bytes but undecodable payload -> 400', async () => {
        // PNG magic bytes followed by garbage
        const corruptPng = Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), Buffer.alloc(100, 0xff)]);
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', corruptPng, { filename: 'corrupt.png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });
    });

    describe(`${route} filename, extension, and path traversal protection`, () => {
      it('rejects mismatched extension (valid JPEG uploaded as .png) -> 400', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', validJpeg, { filename: 'photo.png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects mismatched extension (valid PNG uploaded as .jpg) -> 400', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', validPng, { filename: 'photo.jpg', contentType: 'image/jpeg' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects incompatible MIME header and extension -> 400', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', validPng, { filename: 'photo.png', contentType: 'image/jpeg' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects filename without extension -> 400', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', validPng, { filename: 'image_no_ext', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects path traversal filename with relative dots -> 400', async () => {
        const boundary = '----WebKitFormBoundaryTraversalDots';
        const payload = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="../../traversal.png"\r\nContent-Type: image/png\r\n\r\n`),
          validPng,
          Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);
        const response = await request(app)
          .post(route)
          .set('Authorization', `Bearer ${token('admin')}`)
          .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
          .send(payload);
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects path traversal filename with backslashes -> 400', async () => {
        const boundary = '----WebKitFormBoundaryTraversalBackslash';
        const payload = Buffer.concat([
          Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="..\\..\\traversal.png"\r\nContent-Type: image/png\r\n\r\n`),
          validPng,
          Buffer.from(`\r\n--${boundary}--\r\n`)
        ]);
        const response = await request(app)
          .post(route)
          .set('Authorization', `Bearer ${token('admin')}`)
          .set('Content-Type', `multipart/form-data; boundary=${boundary}`)
          .send(payload);
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects filename containing consecutive dots -> 400', async () => {
        const response = await request(app)
          .post(route)
          .set('Authorization', `Bearer ${token('admin')}`)
          .attach('file', validPng, { filename: 'traversal..png', contentType: 'image/png' });
        expect(response.status).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });

      it('rejects filename containing null byte -> 400', async () => {
        const response = await request(app).post(route).set('Authorization', `Bearer ${token('admin')}`).attach('file', validPng, { filename: 'photo\0.png', contentType: 'image/png' });
        expect(response.status, JSON.stringify(response.body)).toBe(400);
        expect(storage.upload).not.toHaveBeenCalled();
      });
    });
  }
});
