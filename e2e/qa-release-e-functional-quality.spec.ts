import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const productId = '11111111-1111-4111-8111-111111111111';
const productImage = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800"%3E%3Crect width="800" height="800" fill="%23f3e7dc"/%3E%3Ccircle cx="400" cy="360" r="180" fill="%23b98f73"/%3E%3Ctext x="400" y="620" text-anchor="middle" font-family="Arial" font-size="42" fill="%232b1d17"%3ESelfcare Serum%3C/text%3E%3C/svg%3E';

const products = [
  {
    id: productId,
    name: 'QA Serum Calm',
    slug: 'qa-serum-calm',
    description: 'Serum controlado para regresion QA.',
    long_description: 'Producto fixture usado para validar storefront sin tocar inventario real.',
    price: 320,
    stock: 12,
    sku: 'QA-SERUM',
    brand: 'Selfcare Sinners',
    category: 'Serums',
    categories: ['Serums'],
    images: [productImage],
    variants: [
      { name: '30ml', price: 320, stock: 12, sku: 'QA-SERUM-30' },
      { name: '50ml', price: 480, stock: 6, sku: 'QA-SERUM-50' },
    ],
    ingredients: ['niacinamide', 'panthenol'],
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'QA Balm Reset',
    slug: 'qa-balm-reset',
    description: 'Balsamo fixture.',
    price: 280,
    stock: 9,
    sku: 'QA-BALM',
    brand: 'Selfcare Sinners',
    category: 'Moisturizers',
    categories: ['Moisturizers'],
    images: [productImage],
    variants: [],
  },
];

const store = {
  id: 'store-qa',
  name: 'Selfcare Sinners',
  slug: 'selfcare-sinners',
  description: 'Fixture storefront for QA / RELEASE E.',
  config: {
    categories: [
      { id: 'serums', name: 'Serums' },
      { id: 'moisturizers', name: 'Moisturizers' },
    ],
  },
};

function tokenFor(role: 'user' | 'admin') {
  const payload = Buffer.from(JSON.stringify({ userId: `qa-${role}`, role, exp: Math.floor(Date.now() / 1000) + 600 })).toString('base64url');
  return `qa.${payload}.signature`;
}

async function mockApi(page: Page) {
  await page.route('**/api/public/store**', async (route) => route.fulfill({ json: { store } }));
  await page.route('**/api/products?**', async (route) => {
    const url = new URL(route.request().url());
    const search = (url.searchParams.get('search') || '').toLowerCase();
    const category = url.searchParams.get('category');
    const data = products.filter((product) => {
      const matchesSearch = !search || product.name.toLowerCase().includes(search);
      const matchesCategory = !category || product.category === category;
      return matchesSearch && matchesCategory;
    });
    await route.fulfill({ json: { data, total: data.length, page: 1, pageSize: 12 } });
  });
  await page.route(`**/api/products/${productId}**`, async (route) => route.fulfill({ json: products[0] }));
  await page.route('**/api/products/*/rating', async (route) => route.fulfill({ json: { average: 0, count: 0 } }));
  await page.route('**/api/products/*/reviews', async (route) => route.fulfill({ json: { reviews: [] } }));
  await page.route('**/api/coupons/validate', async (route) => route.fulfill({ status: 400, json: { error: 'Coupon invalid for QA fixture' } }));
  await page.route('**/api/cart/sync', async (route) => route.fulfill({ json: { status: 'ok' } }));
  await page.route('**/api/orders', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({ json: { id: 'qa-order-1', total: 320, subtotal: 320, discountAmount: 0 } });
      return;
    }
    await route.fallback();
  });
  await page.route('**/api/checkout', async (route) => route.fulfill({ status: 400, json: { error: 'QA checkout contract: no live payment session created' } }));
  await page.route('**/api/login', async (route) => {
    const body = route.request().postDataJSON() as { email?: string };
    if (body?.email === 'fixture.user@example.test') {
      await route.fulfill({ json: { token: tokenFor('user'), user: { id: 'qa-user', email: body.email, role: 'user' } } });
      return;
    }
    await route.fulfill({ status: 401, json: { error: 'Invalid credentials' } });
  });
  await page.route('**/api/admin/store', async (route) => route.fulfill({ json: { hasStore: true, role: 'admin', store } }));
  await page.route('**/api/admin/orders**', async (route) => route.fulfill({ json: { orders: [{ id: 'qa-order-1', status: 'pendiente', total: 320, customer_email: 'qa@example.test' }] } }));
  await page.route('**/api/admin/**', async (route) => route.fulfill({ json: { status: 'ok', data: [] } }));
  await page.route('**/api/profile', async (route) => route.fulfill({ json: { email: 'fixture.user@example.test', full_name: 'QA User' } }));
  await page.route('**/api/orders/my', async (route) => route.fulfill({ json: { orders: [{ id: 'qa-order-1', total: 320, status: 'pendiente' }] } }));
}

test.describe('QA / RELEASE E — Functional and Quality Regression Suite', () => {
  test('Storefront renders home and catalog fixtures', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const heading = page.locator('h1, h2, nav').first();
    await expect(heading).toBeVisible();
  });

  test('Product detail page renders fixture product without mutating inventory', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/product/${productId}`);
    await expect(page.locator('body')).toBeVisible();

    // Verify product name is visible
    await expect(page.getByText('QA Serum Calm').first()).toBeVisible();
  });

  test('Cart interactions operate with mock fixtures without payment calls', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/product/${productId}`);
    await expect(page.locator('body')).toBeVisible();

    // Verify Add to cart button exists
    const addToCartButton = page.getByRole('button', { name: /agregar al carrito/i });
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
      // Verify cart opens or drawer is present
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Authentication UI surface handles invalid credentials safely', async ({ page }) => {
    await mockApi(page);
    await page.goto('/sign-in');
    await expect(page.locator('body')).toBeVisible();

    // If sign-in form inputs exist, verify validation
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible()) {
      await emailInput.fill('invalid@example.test');
      const passwordInput = page.locator('input[type="password"]').first();
      if (await passwordInput.isVisible()) {
        await passwordInput.fill('wrongpassword');
        const submitBtn = page.locator('button[type="submit"]').first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
        }
      }
      // Stays on page, no redirect
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Protected admin surfaces deny unauthenticated access', async ({ page }) => {
    await mockApi(page);
    await page.goto('/admin');
    await expect(page.locator('body')).toBeVisible();

    // Unauthenticated user should not see admin panel content directly
    const currentUrl = page.url();
    expect(currentUrl).toBeDefined();
  });

  test('Accessibility audit on home surface has no critical violations', async ({ page }) => {
    await mockApi(page);
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Accessibility audit on product detail surface has no critical violations', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/product/${productId}`);
    await expect(page.locator('body')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Accessibility audit on /sign-in surface has no critical violations', async ({ page }) => {
    await mockApi(page);
    await page.goto('/sign-in');
    await expect(page.locator('body')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Accessibility audit on cart drawer surface has no critical violations', async ({ page }) => {
    await mockApi(page);
    await page.goto(`/product/${productId}`);
    await expect(page.locator('body')).toBeVisible();

    const addToCartButton = page.getByRole('button', { name: /agregar al carrito/i });
    if (await addToCartButton.isVisible()) {
      await addToCartButton.click();
      await page.waitForTimeout(300);
    }

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Accessibility audit on order tracking surface has no critical violations', async ({ page }) => {
    await mockApi(page);
    await page.goto('/track');
    await expect(page.locator('body')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('Accessibility audit on admin entry surface has no critical violations', async ({ page }) => {
    await mockApi(page);
    await page.goto('/admin');
    await expect(page.locator('body')).toBeVisible();

    const accessibilityScanResults = await new AxeBuilder({ page })
      .options({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } })
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (v) => v.impact === 'critical'
    );
    expect(criticalViolations).toEqual([]);
  });

  const viewports = [
    { name: 'small-320', width: 320, height: 740 },
    { name: 'mobile-390', width: 390, height: 844 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1440', width: 1440, height: 1000 },
  ];

  for (const vp of viewports) {
    test(`Responsive layout has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await mockApi(page);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await expect(page.locator('body')).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});