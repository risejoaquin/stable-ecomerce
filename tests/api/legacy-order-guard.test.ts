// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  LegacyOrderValidationError,
  enforcePrimaryStoreScope,
  reserveLegacyLine,
  resolveLegacyCatalogLine
} from '../../src/server/orders/legacy-order-guard';

const product = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Premium hoodie',
  sku: 'HD-BASE',
  price: 450,
  stock: 10,
  status: 'active',
  variants: [
    { name: 'S', sku: 'HD-S', price: 450, stock: 2 },
    { name: 'M', sku: 'HD-M', price: 499, stock: 1 }
  ]
};
describe('pre-cutover guard: scoped storefront & variant stock', () => {
  it('enforces the configured primary store and rejects cross-store input', () => {
    expect(enforcePrimaryStoreScope(null, 'store-a')).toBe('store-a');
    expect(enforcePrimaryStoreScope('store-a', 'store-a')).toBe('store-a');
    expect(() => enforcePrimaryStoreScope('store-b', 'store-a')).toThrow('Store is not available');
    expect(() => enforcePrimaryStoreScope('store-b', 'store-a')).toThrow(LegacyOrderValidationError);
  });

  it('resolves variant from trusted catalog data, not user-supplied price/name', () => {
    expect(resolveLegacyCatalogLine(product, { variantName: 'M', sku: 'HD-M' })).toMatchObject({
      variantName: 'M', sku: 'HD-M', unitPrice: 499, available: 1, displayName: 'Premium hoodie - M'
    });
    expect(resolveLegacyCatalogLine(product, { sku: 'HD-S' }).available).toBe(2);
    expect(resolveLegacyCatalogLine(product, { variantName: 's' }).available).toBe(2);
  });

  it('fails closed when a variant is missing, ambiguous or mismatched', () => {
    for (const input of [{}, { sku: 'HD-BASE' }, { variantName: 'XL' },
      { sku: 'HD-UNKNOWN' }, { variantName: 'M', sku: 'HD-S' }]) {
      expect(() => resolveLegacyCatalogLine(product, input)).toThrow(LegacyOrderValidationError);
    }
    const duplicate = { ...product, variants: [product.variants[0], { ...product.variants[0] }] };
    expect(() => resolveLegacyCatalogLine(duplicate, { sku: 'HD-S' })).toThrow(/ambiguous/);
  });

  it('rejects variant identifiers on simple products', () => {
    const simple = { ...product, variants: [] };
    expect(resolveLegacyCatalogLine(simple, { sku: 'HD-BASE' }).available).toBe(10);
    expect(() => resolveLegacyCatalogLine(simple, { variantName: 'S' })).toThrow('Unknown product variant');
    expect(() => resolveLegacyCatalogLine(simple, { sku: 'HD-M' })).toThrow('Unknown product variant');
  });

  it('accepts zero price, rejects invalid pricing and inventory', () => {
    const simple = { ...product, variants: [], price: 0 };
    expect(resolveLegacyCatalogLine(simple, {}).unitPrice).toBe(0);
    for (const price of [-1, 2.001, Infinity, 'NaN']) {
      expect(() => resolveLegacyCatalogLine({ ...simple, price }, {})).toThrow('Invalid catalog price');
    }
    for (const stock of [-1, 1.5, null, undefined]) {
      expect(() => resolveLegacyCatalogLine({ ...simple, stock: stock as number }, {}))
        .toThrow('Invalid inventory value');
    }
  });

  it('aggregates duplicate lines for the same SKU, but isolates distinct variants', () => {
    const map = new Map<string, { requested: number; available: number }>();
    const s = resolveLegacyCatalogLine(product, { sku: 'HD-S' });
    const m = resolveLegacyCatalogLine(product, { sku: 'HD-M' });
    reserveLegacyLine(map, product.id, s, 1);
    reserveLegacyLine(map, product.id, s, 1);
    reserveLegacyLine(map, product.id, m, 1);
    expect(map.size).toBe(2);
    expect(() => reserveLegacyLine(map, product.id, s, 1)).toThrow('Insufficient stock');
    expect(() => reserveLegacyLine(map, product.id, m, 1)).toThrow('Insufficient stock');
    expect(() => reserveLegacyLine(map, product.id, s, 0)).toThrow('Invalid item quantity');
    expect(() => reserveLegacyLine(map, product.id, s, 1.5)).toThrow('Invalid item quantity');
  });

  it('wires store isolation and checkout aggregate preflight without claiming atomic stock', () => {
    const code = readFileSync(new URL('../../server.ts', import.meta.url), 'utf8');
    expect(code).toContain('enforcePrimaryStoreScope(storeId, primaryStoreId)');
    expect(code).toContain(".eq('store_id', storeId)\n                .eq('status', 'active')");
    expect(code).toContain('reserveLegacyLine(reservations, product.id, selection, item.quantity)');
    expect(code).toContain('reserveLegacyLine(checkoutReservations, product.id, selection, item.quantity)');
    expect(code).toContain('if (itemsInsertError) throw itemsInsertError');
    expect(code).toContain("products(id, name, sku, price, stock, variants, store_id, status)");
  });
});
