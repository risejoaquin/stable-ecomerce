// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';

describe('AUDIT-01A / SEC-003: Public API Data Minimization Contracts', () => {
  const serverTsPath = path.resolve(__dirname, '../../server.ts');
  const serverTsContent = fs.readFileSync(serverTsPath, 'utf-8');

  let app: any;
  let originalFetch: typeof globalThis.fetch;

  // Canonical forbidden internal fields that must NEVER appear in public responses
  const FORBIDDEN_FIELDS = [
    'cost_price',
    'supplier_id',
    'supplier_sku',
    'stripe_connect_id',
    'fee_structure',
    'balance',
    'internal_status',
    'internal_notes',
    'internal_rule_expr',
    'max_budget',
    'total_spent',
    'customer_segment_id',
    'created_by',
    'internal_roi_target',
    'owner_user_id',
    'cost',
    'supplier',
    'budget',
    'budget_daily',
    'score',
    'recommendation',
    'executed_by',
    'executed_at'
  ];

  function assertNoForbiddenFields(obj: any, context = 'root') {
    if (!obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      obj.forEach((item, idx) => assertNoForbiddenFields(item, `${context}[${idx}]`));
      return;
    }
    for (const field of FORBIDDEN_FIELDS) {
      expect(
        obj,
        `Security violation: forbidden field "${field}" leaked at ${context}`
      ).not.toHaveProperty(field);
    }
    // Recursively check known nested objects
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        assertNoForbiddenFields(obj[key], `${context}.${key}`);
      }
    }
  }

  // Helper to project database rows based on PostgREST select parameter
  function projectRow(row: Record<string, any>, selectParam: string | null): Record<string, any> {
    if (!selectParam || selectParam === '*' || selectParam.includes('*')) {
      return { ...row };
    }
    const requestedFields = selectParam.split(',').map((f) => f.trim().split('(')[0]);
    const projected: Record<string, any> = {};
    for (const field of requestedFields) {
      if (field in row) {
        projected[field] = row[field];
      }
    }
    return projected;
  }

  // Dirty mock database records containing all internal and sensitive fields
  const mockStoreRow = {
    id: 'store-1111-2222-3333',
    name: 'Selfcare Sinners',
    slug: 'selfcare-sinners',
    description: 'Boutique Skincare',
    config: { themeColor: '#6B705C' },
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    // Sensitive / Internal fields
    owner_user_id: 'user-secret-owner',
    stripe_connect_id: 'acct_123456789_secret',
    fee_structure: { platform_cut: 0.1 },
    balance: 50000.0,
    internal_status: 'audited',
    internal_notes: 'Highly sensitive internal store notes',
    plan: 'enterprise',
    lifecycle_config: { retention_flag: true },
    paid_traffic_mode: 'active'
  };

  const mockProductRow = {
    id: 'prod-aaaa-bbbb-cccc',
    store_id: 'store-1111-2222-3333',
    name: 'Serum Regenerador Vitamina C',
    slug: 'serum-regenerador-vitamina-c',
    description: 'Tratamiento facial intensivo antioxidante',
    long_description: 'Fórmula dermatológica con vitamina C pura al 15%',
    price: 850.0,
    compare_at_price: 990.0,
    stock: 25,
    brand: 'Selfcare Sinners',
    category: 'Facial',
    categories: ['Facial', 'Antioxidantes'],
    subcategory: 'Serums',
    variants: [{ id: 'var-1', name: '30ml', price: 850.0, stock: 25 }],
    status: 'active',
    images: ['https://example.com/serum.jpg'],
    image_url: 'https://example.com/serum.jpg',
    image_alt_text: 'Serum Regenerador Vitamina C',
    is_featured: true,
    sort_priority: 1,
    short_marketing_copy: 'Brillo y juventud para tu piel',
    hero_badge: 'Bestseller',
    sku: 'SKU-SERUM-001',
    seo_title: 'Serum Regenerador Vitamina C | Selfcare Sinners',
    seo_description: 'Compra el mejor Serum Regenerador Vitamina C',
    ingredients: ['Aqua', 'Ascorbic Acid', 'Hyaluronic Acid'],
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    // Sensitive / Internal fields
    cost_price: 180.0,
    cost: 180.0,
    preferred_supplier_cost: 175.0,
    supplier_id: 'sup-secret-999',
    primary_supplier_id: 'sup-secret-999',
    supplier_sku: 'SUP-SKU-SECRET-001',
    supplier: 'Proveedor Internacional S.A.',
    internal_status: 'approved',
    internal_notes: 'Margen comercial 78% altamente rentable',
    internal_rule_expr: 'stock > 10 AND cost < 200',
    margin_percent: 78.5,
    catalog_quality_score: 95,
    catalog_validation_issues: [],
    reorder_point: 5,
    reorder_quantity: 20
  };

  const mockCommercialCampaignRow = {
    id: 'camp-comm-1111',
    store_id: 'store-1111-2222-3333',
    name: 'Campaña Primavera Glow',
    type: 'promotion',
    channel: 'meta',
    status: 'active',
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-10-01T00:00:00Z',
    metadata: {
      headline: 'Luce tu mejor versión',
      body: 'Descuento exclusivo en serums',
      cta: 'Ver productos',
      href: '/#catalogo'
    },
    // Sensitive / Internal fields
    budget: 15000.0,
    max_budget: 20000.0,
    total_spent: 4500.0,
    customer_segment_id: 'seg-vip-888',
    internal_roi_target: 4.5,
    notes: 'Presupuesto ampliable si CAC < $150',
    internal_notes: 'Campaña prioritaria para cierre de mes',
    internal_rule_expr: 'cac <= 150',
    created_by: 'user-admin-001',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z'
  };

  const mockLandingPageRow = {
    id: 'land-1111-2222',
    store_id: 'store-1111-2222-3333',
    campaign_id: 'paid-camp-1111',
    slug: 'primavera-glow',
    title: 'Landing Glow Especial',
    subtitle: 'Rutinas con descuento directo',
    headline: 'Descubre el poder de la Vitamina C',
    value_proposition: 'Piel luminosa en 7 días',
    hero_image_url: 'https://example.com/hero.jpg',
    primary_cta: 'Comprar ahora',
    secondary_cta: 'Ver opiniones',
    status: 'published',
    content: { intro: 'Bienvenido' },
    seo_title: 'Primavera Glow Landing',
    seo_description: 'Aprovecha nuestra promo especial',
    metadata: { theme: 'gold' },
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    // Sensitive / Internal fields
    landing_key: 'landing-primavera',
    score: 98.5,
    recommendation: 'Escalar presupuesto a $5,000 diario',
    executed_by: 'user-admin-002',
    executed_at: '2026-09-01T00:00:00Z',
    internal_notes: 'Landing de alta conversión para tráfico de Instagram'
  };

  const mockPaidTrafficCampaignRow = {
    id: 'paid-camp-1111',
    store_id: 'store-1111-2222-3333',
    name: 'Meta Ads - Serum Vit C',
    slug: 'meta-serum-vit-c',
    channel: 'meta',
    objective: 'conversions',
    status: 'active',
    utm_source: 'instagram',
    utm_medium: 'paid_social',
    utm_campaign: 'primavera_glow',
    coupon_code: 'GLOW10',
    metadata: { ad_set: 'intereses_skincare' },
    starts_at: '2026-09-01T00:00:00Z',
    ends_at: '2026-10-01T00:00:00Z',
    // Sensitive / Internal fields
    budget_daily: 2500.0,
    max_budget: 50000.0,
    total_spent: 12000.0,
    commercial_campaign_id: 'camp-comm-1111',
    target_audience: { ages: [25, 45], locations: ['MX'] },
    internal_status: 'scaling',
    internal_notes: 'Campaña con mejor ROAS del trimestre',
    created_by: 'user-admin-003',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z'
  };

  const mockCouponRow = {
    id: 'coup-1111-2222',
    store_id: 'store-1111-2222-3333',
    code: 'GLOW10',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_amount: 500,
    max_uses: 100,
    current_uses: 23,
    expires_at: '2026-12-31T23:59:59Z',
    is_active: true,
    // Sensitive / Internal fields
    max_budget: 10000.0,
    total_spent: 2300.0,
    customer_segment_id: 'seg-new-buyers',
    created_by: 'user-admin-004',
    internal_notes: 'Cupón exclusivo para checkout web',
    internal_rule_expr: 'order_total >= 500 AND user_first_order == true',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z'
  };

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'audit-01a-test-secret-key-32chars!!';
    process.env.SUPABASE_URL = 'https://mock-audit01a.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key';
    process.env.SUPABASE_ANON_KEY = 'mock-anon-key';

    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: any, init?: any) => {
      const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url || '';
      if (urlStr.includes('mock-audit01a.supabase.co')) {
        const parsedUrl = new URL(urlStr);
        const pathname = parsedUrl.pathname;
        const selectParam = parsedUrl.searchParams.get('select');

        const headers = init?.headers;
        let accept = '';
        if (headers) {
          if (typeof headers.get === 'function') accept = headers.get('accept') || headers.get('Accept') || '';
          else if (typeof headers === 'object') accept = (headers as any).accept || (headers as any).Accept || '';
        }
        const isSingle = accept.includes('vnd.pgrst.object+json');

        if (pathname.includes('/stores')) {
          const projected = projectRow(mockStoreRow, selectParam);
          return new Response(JSON.stringify(isSingle ? projected : [projected]), {
            status: 200,
            headers: {
              'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
              'Content-Range': '0-0/1'
            }
          });
        }

        if (pathname.includes('/products')) {
          const projected = projectRow(mockProductRow, selectParam);
          return new Response(JSON.stringify(isSingle ? projected : [projected]), {
            status: 200,
            headers: {
              'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
              'Content-Range': '0-0/1'
            }
          });
        }

        if (pathname.includes('/commercial_campaigns')) {
          const projected = projectRow(mockCommercialCampaignRow, selectParam);
          return new Response(JSON.stringify([projected]), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Content-Range': '0-0/1'
            }
          });
        }

        if (pathname.includes('/campaign_landing_pages')) {
          const projected = projectRow(mockLandingPageRow, selectParam);
          return new Response(JSON.stringify(isSingle ? projected : [projected]), {
            status: 200,
            headers: {
              'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
              'Content-Range': '0-0/1'
            }
          });
        }

        if (pathname.includes('/paid_traffic_campaigns')) {
          const projected = projectRow(mockPaidTrafficCampaignRow, selectParam);
          return new Response(JSON.stringify(isSingle ? projected : [projected]), {
            status: 200,
            headers: {
              'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
              'Content-Range': '0-0/1'
            }
          });
        }

        if (pathname.includes('/coupons')) {
          const projected = projectRow(mockCouponRow, selectParam);
          return new Response(JSON.stringify(isSingle ? projected : [projected]), {
            status: 200,
            headers: {
              'Content-Type': isSingle ? 'application/vnd.pgrst.object+json' : 'application/json',
              'Content-Range': '0-0/1'
            }
          });
        }

        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return originalFetch(input, init);
    };

    const serverModule = await import('../../server');
    app = await serverModule.startServer({ listen: false });
  }, 30000);

  afterAll(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    }
  });

  // ==========================================================================
  // 1. STATIC PROJECTION CONSTANTS & CONTRACTS
  // ==========================================================================
  describe('Static Projection Code Contracts', () => {
    it('defines PUBLIC_STORE_SELECT containing only safe public store attributes', () => {
      expect(serverTsContent).toContain('const PUBLIC_STORE_SELECT =');
      const match = serverTsContent.match(/const PUBLIC_STORE_SELECT = '([^']+)';/);
      expect(match).not.toBeNull();
      const fields = match![1].split(',').map((f) => f.trim());
      expect(fields).toContain('id');
      expect(fields).toContain('name');
      expect(fields).toContain('slug');
      expect(fields).toContain('description');
      expect(fields).toContain('config');
      expect(fields).not.toContain('owner_user_id');
      expect(fields).not.toContain('stripe_connect_id');
      expect(fields).not.toContain('fee_structure');
      expect(fields).not.toContain('balance');
      expect(fields).not.toContain('internal_status');
      expect(fields).not.toContain('internal_notes');
      expect(fields).not.toContain('plan');
      expect(fields).not.toContain('lifecycle_config');
    });

    it('defines PUBLIC_PRODUCT_SELECT containing only safe public product attributes', () => {
      expect(serverTsContent).toContain('const PUBLIC_PRODUCT_SELECT =');
      const match = serverTsContent.match(/const PUBLIC_PRODUCT_SELECT = '([^']+)';/);
      expect(match).not.toBeNull();
      const fields = match![1].split(',').map((f) => f.trim());
      expect(fields).toContain('id');
      expect(fields).toContain('store_id');
      expect(fields).toContain('name');
      expect(fields).toContain('slug');
      expect(fields).toContain('price');
      expect(fields).toContain('images');
      expect(fields).toContain('sku');
      expect(fields).toContain('seo_title');
      expect(fields).toContain('seo_description');
      expect(fields).toContain('ingredients');
      expect(fields).not.toContain('cost_price');
      expect(fields).not.toContain('cost');
      expect(fields).not.toContain('supplier_id');
      expect(fields).not.toContain('primary_supplier_id');
      expect(fields).not.toContain('supplier_sku');
      expect(fields).not.toContain('supplier');
      expect(fields).not.toContain('margin_percent');
      expect(fields).not.toContain('reorder_point');
      expect(fields).not.toContain('reorder_quantity');
      expect(fields).not.toContain('lead_time_days');
      expect(fields).not.toContain('catalog_quality_score');
      expect(fields).not.toContain('catalog_validation_issues');
      expect(fields).not.toContain('internal_notes');
      expect(fields).not.toContain('internal_rule_expr');
    });

    it('verifies all 7 in-scope routes do not use wildcard select(*) queries', () => {
      function getRouteBlock(startPattern: string, nextPattern: string): string {
        const start = serverTsContent.indexOf(startPattern);
        expect(start).toBeGreaterThan(-1);
        const end = serverTsContent.indexOf(nextPattern, start);
        expect(end).toBeGreaterThan(start);
        return serverTsContent.slice(start, end);
      }

      // 1. GET /api/public/store
      const storeRoute = getRouteBlock("app.get('/api/public/store'", "app.get('/api/wishlist'");
      expect(storeRoute).not.toContain(".select('*')");
      expect(storeRoute).toContain('PUBLIC_STORE_SELECT');
      expect(storeRoute).toContain('PUBLIC_PRODUCT_SELECT');

      // 2. GET /api/stores/:slug
      const slugRoute = getRouteBlock("app.get('/api/stores/:slug'", "const xmlEscape");
      expect(slugRoute).not.toContain(".select('*')");
      expect(slugRoute).toContain('PUBLIC_STORE_SELECT');

      // 3. GET /api/products/:id
      const prodIdRoute = getRouteBlock("app.get('/api/products/:id'", "app.get('/api/products'");
      expect(prodIdRoute).not.toContain(".select('*')");
      expect(prodIdRoute).toContain('PUBLIC_PRODUCT_SELECT');

      // 4. GET /api/products
      const prodsRoute = getRouteBlock("app.get('/api/products'", "app.get('/api/products/:productId/reviews'");
      expect(prodsRoute).not.toContain(".select('*'");
      expect(prodsRoute).toContain('PUBLIC_PRODUCT_SELECT');

      // 5. GET /api/public/home
      const homeRoute = getRouteBlock("app.get('/api/public/home'", "app.post('/api/analytics/events'");
      expect(homeRoute).not.toContain(".from('commercial_campaigns')\n          .select('*')");
      expect(homeRoute).toContain('PUBLIC_COMMERCIAL_CAMPAIGN_SELECT');
      expect(homeRoute).toContain('campaigns: publicCampaigns');

      // 6. GET /api/public/campaigns/:slug/landing
      const landingRoute = getRouteBlock("app.get('/api/public/campaigns/:slug/landing'", "app.get('/api/public/product-feed'");
      expect(landingRoute).not.toContain(".from('campaign_landing_pages')\n        .select('*')");
      expect(landingRoute).not.toContain(".from('paid_traffic_campaigns').select('*')");
      expect(landingRoute).toContain('PUBLIC_CAMPAIGN_LANDING_PAGE_SELECT');
      expect(landingRoute).toContain('PUBLIC_PAID_TRAFFIC_CAMPAIGN_SELECT');

      // 7. POST /api/coupons/validate
      const couponRoute = getRouteBlock("app.post('/api/coupons/validate'", "app.post('/api/cart/sync'");
      expect(couponRoute).not.toContain(".select('*')");
      expect(couponRoute).toContain('safeCoupon');
      expect(couponRoute).not.toContain('res.json({ valid: true, discountAmount, coupon });');
    });
  });

  // ==========================================================================
  // 2. FUNCTIONAL SECURITY TESTS: FORBIDDEN FIELD ABSENCE
  // ==========================================================================
  describe('Functional Security Response Tests: Explicit Forbidden Field Absence', () => {
    it('GET /api/public/store returns safe store and products without leaking sensitive fields', async () => {
      const res = await request(app).get('/api/public/store');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('store');
      expect(res.body).toHaveProperty('products');

      // Check required public fields exist
      expect(res.body.store).toHaveProperty('name', 'Selfcare Sinners');
      expect(res.body.store).toHaveProperty('slug', 'selfcare-sinners');
      expect(Array.isArray(res.body.products)).toBe(true);
      expect(res.body.products[0]).toHaveProperty('name', 'Serum Regenerador Vitamina C');
      expect(res.body.products[0]).toHaveProperty('sku', 'SKU-SERUM-001');

      // Assert explicit absence of all forbidden fields
      assertNoForbiddenFields(res.body);
    });

    it('GET /api/stores/:slug returns safe store metadata and omits financial/owner fields', async () => {
      const res = await request(app).get('/api/stores/selfcare-sinners');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('name', 'Selfcare Sinners');
      expect(res.body).toHaveProperty('slug', 'selfcare-sinners');
      expect(res.body).toHaveProperty('config');

      // Assert explicit absence of all forbidden fields
      assertNoForbiddenFields(res.body);
    });

    it('GET /api/products/:id returns safe product details and omits supplier/cost data', async () => {
      const res = await request(app).get('/api/products/prod-aaaa-bbbb-cccc');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'prod-aaaa-bbbb-cccc');
      expect(res.body).toHaveProperty('name', 'Serum Regenerador Vitamina C');
      expect(res.body).toHaveProperty('price', 850.0);
      expect(res.body).toHaveProperty('sku', 'SKU-SERUM-001');
      expect(res.body).toHaveProperty('seo_title');
      expect(res.body).toHaveProperty('ingredients');

      // Assert explicit absence of all forbidden fields
      assertNoForbiddenFields(res.body);
    });

    it('GET /api/products returns product catalog and omits supplier/cost data across all items', async () => {
      const res = await request(app).get('/api/products?store_slug=selfcare-sinners');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty('name', 'Serum Regenerador Vitamina C');

      // Assert explicit absence of all forbidden fields across data array
      assertNoForbiddenFields(res.body);
    });

    it('GET /api/public/home returns safe store, banners, categories, and campaigns without budgets or notes', async () => {
      const res = await request(app).get('/api/public/home');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('store');
      expect(res.body).toHaveProperty('banners');
      expect(res.body).toHaveProperty('categories');
      expect(res.body).toHaveProperty('featuredProducts');
      expect(res.body).toHaveProperty('campaigns');

      // Check banners do not expose notes
      expect(res.body.banners[0]).toHaveProperty('headline', 'Luce tu mejor versión');
      expect(res.body.banners[0]).toHaveProperty('body', 'Descuento exclusivo en serums');

      // Check campaigns DTO
      expect(res.body.campaigns[0]).toHaveProperty('name', 'Campaña Primavera Glow');

      // Assert explicit absence of all forbidden fields across entire payload
      assertNoForbiddenFields(res.body);
    });

    it('GET /api/public/campaigns/:slug/landing returns safe campaign landing page without budget or internal score', async () => {
      const res = await request(app).get('/api/public/campaigns/primavera-glow/landing');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('landingPage');
      expect(res.body).toHaveProperty('campaign');
      expect(res.body).toHaveProperty('products');

      // Check landingPage attributes
      expect(res.body.landingPage).toHaveProperty('title', 'Landing Glow Especial');
      expect(res.body.landingPage).toHaveProperty('headline', 'Descubre el poder de la Vitamina C');

      // Check campaign attributes
      expect(res.body.campaign).toHaveProperty('name', 'Meta Ads - Serum Vit C');
      expect(res.body.campaign).toHaveProperty('utm_source', 'instagram');

      // Assert explicit absence of all forbidden fields
      assertNoForbiddenFields(res.body);
    });

    it('POST /api/coupons/validate returns safe dedicated coupon validation DTO without internal limits or usage', async () => {
      const res = await request(app)
        .post('/api/coupons/validate')
        .send({ code: 'GLOW10', storeId: 'store-1111-2222-3333', orderTotal: 1000 });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('valid', true);
      expect(res.body).toHaveProperty('code', 'GLOW10');
      expect(res.body).toHaveProperty('discount_type', 'percentage');
      expect(res.body).toHaveProperty('discount_value', 10);
      expect(res.body).toHaveProperty('discountAmount', 100);
      expect(res.body).toHaveProperty('message', 'Cupón aplicado con éxito');
      expect(res.body).toHaveProperty('coupon');
      expect(res.body.coupon).toEqual({
        code: 'GLOW10',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 500
      });

      // Assert explicit absence of raw coupon fields (max_uses, current_uses, store_id, id, created_at, max_budget, etc.)
      assertNoForbiddenFields(res.body);
      expect(res.body).not.toHaveProperty('max_uses');
      expect(res.body).not.toHaveProperty('current_uses');
      expect(res.body).not.toHaveProperty('created_at');
      expect(res.body.coupon).not.toHaveProperty('max_uses');
      expect(res.body.coupon).not.toHaveProperty('current_uses');
      expect(res.body.coupon).not.toHaveProperty('created_at');
      expect(res.body.coupon).not.toHaveProperty('id');
      expect(res.body.coupon).not.toHaveProperty('store_id');
    });
  });
});
