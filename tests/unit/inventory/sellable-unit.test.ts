// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import type { Product, ProductVariant } from '../../../src/types/index';
import {
  CreateSellableUnitSchema,
  SellableUnitSchema,
  UpdateSellableUnitSchema,
  mapProductToDefaultSellableUnit,
  mapVariantToSellableUnit,
  type LegacyInventoryProduct,
  type SellableUnit,
  type SellableUnitMappingIdentity,
} from '../../../src/types/inventory';
import { InventoryService, type SellableUnitRepository } from '../../../src/services/inventory-service';
import { generateDefaultSku, generateVariantSku, getVariantTitle, normalizeBarcode, normalizeSku, sanitizeSku } from '../../../src/utils/sku-helpers';

const identity: SellableUnitMappingIdentity = {
  id: 'unit-1',
  createdAt: '2026-10-02T00:00:00Z',
  updatedAt: '2026-10-02T01:00:00Z',
};
const product: Product = {
  id: 'product-1', name: 'Serum', slug: 'sérum-glow', price: 200, stock: 7,
  status: 'active', images: [],
};
const createInput = { productId: product.id, title: product.name, sku: 'SERUM-01' };

describe('SKU helpers and validation', () => {
  it('normalizes a valid SKU consistently in helpers and schemas', () => {
    expect(normalizeSku('serum_01-red')).toBe('SERUM_01-RED');
    expect(CreateSellableUnitSchema.parse({ ...createInput, sku: 'serum_01-red' }).sku).toBe('SERUM_01-RED');
    expect(UpdateSellableUnitSchema.parse({ sku: 'serum_01-red' }).sku).toBe('SERUM_01-RED');
  });

  it.each(['', ' ', 'SER UM', ' SERUM', 'SERUM ', 'SERUM\n', 'SERUM/01', 'SERUM;DROP', 'SÉRUM', 'ß', '💄'])('rejects invalid submitted SKU %j', (sku) => {
    expect(() => normalizeSku(sku)).toThrow();
    expect(CreateSellableUnitSchema.safeParse({ ...createInput, sku }).success).toBe(false);
    expect(UpdateSellableUnitSchema.safeParse({ sku }).success).toBe(false);
  });

  it.each([undefined, null, 123, {}, []])('rejects non-string SKU input %j', (sku) => {
    expect(() => normalizeSku(sku)).toThrow();
    expect(() => sanitizeSku(sku)).toThrow();
    expect(CreateSellableUnitSchema.safeParse({ ...createInput, sku }).success).toBe(false);
  });

  it('sanitizes accents, whitespace and punctuation deterministically', () => {
    expect(sanitizeSku(' sérum-Édición / 01! ')).toBe('SERUM-EDICION01');
    expect(sanitizeSku('se\u0301rum')).toBe(sanitizeSku('sérum'));
    expect(generateDefaultSku(product)).toBe('SKU-SERUMGLOW');
    expect(generateDefaultSku(product)).toBe(generateDefaultSku({ ...product }));
  });

  it('preserves a valid product SKU even without a slug', () => {
    expect(generateDefaultSku({ sku: 'existing_01' })).toBe('EXISTING_01');
  });

  it('falls back to the slug for an invalid existing SKU', () => {
    expect(generateDefaultSku({ sku: 'INVALID SKU', slug: 'serum' })).toBe('SKU-SERUM');
  });

  it.each([undefined, '', ' ', '💄', '--__', 123])('rejects an unusable slug explicitly: %j', (slug) => {
    expect(() => generateDefaultSku({ slug: slug as string })).toThrow();
  });

  it('preserves a valid variant SKU without needing parent slug or variant title', () => {
    expect(generateVariantSku({}, { name: '', sku: 'red-01', stock: 1 })).toBe('RED-01');
  });

  it('uses the documented parent SKU and stable variant title/name for fallback', () => {
    const variant: ProductVariant = { name: 'Rójo / L', stock: 1 };
    expect(generateVariantSku(product, variant)).toBe('SKU-SERUMGLOW-ROJOL');
    expect(generateVariantSku(product, variant)).toBe(generateVariantSku({ ...product }, { ...variant }));
    expect(generateVariantSku({ sku: 'PARENT' }, { ...variant, sku: 'bad sku', title: 'Ázul' })).toBe('PARENT-AZUL');
    expect(generateVariantSku(product, { ...variant, title: ' ' })).toBe('SKU-SERUMGLOW-ROJOL');
    expect(generateVariantSku(product, { ...variant, title: 123 })).toBe('SKU-SERUMGLOW-ROJOL');
  });

  it.each(['', ' ', null, 1])('rejects missing/invalid variant names: %j', (name) => {
    expect(() => getVariantTitle({ name, stock: 0 } as ProductVariant)).toThrow();
  });

  it('rejects a variant label with no usable SKU characters', () => {
    expect(() => generateVariantSku(product, { name: '💄', stock: 0 })).toThrow();
  });
});

describe('domain schemas', () => {
  it('defaults nullable fields, attributes, stock and status without changing input', () => {
    expect(CreateSellableUnitSchema.parse(createInput)).toEqual({
      ...createInput, barcode: null, priceOverride: null, costPrice: null,
      attributes: {}, stock: 0, status: 'active',
    });
    expect(createInput).toEqual({ productId: 'product-1', title: 'Serum', sku: 'SERUM-01' });
  });

  it('supports explicit nulls and zero monetary values', () => {
    expect(CreateSellableUnitSchema.parse({ ...createInput, barcode: null, priceOverride: null, costPrice: null })).toMatchObject({ barcode: null, priceOverride: null, costPrice: null });
    expect(CreateSellableUnitSchema.parse({ ...createInput, priceOverride: 0, costPrice: 0 })).toMatchObject({ priceOverride: 0, costPrice: 0 });
  });

  it.each(['active', 'archived', 'discontinued'])('accepts frozen status %s', (status) => {
    expect(CreateSellableUnitSchema.safeParse({ ...createInput, status }).success).toBe(true);
  });

  it.each(['draft', 'out_of_stock', 'deleted', '', null])('rejects unsupported status %j', (status) => {
    expect(CreateSellableUnitSchema.safeParse({ ...createInput, status }).success).toBe(false);
    expect(UpdateSellableUnitSchema.safeParse({ status }).success).toBe(false);
  });

  it.each(['priceOverride', 'costPrice'])('rejects negative/nonfinite money in %s', (field) => {
    for (const value of [-1, NaN, Infinity, '5']) {
      expect(CreateSellableUnitSchema.safeParse({ ...createInput, [field]: value }).success).toBe(false);
      expect(UpdateSellableUnitSchema.safeParse({ [field]: value }).success).toBe(false);
    }
  });

  it.each([-1, 1.5, NaN, Infinity, '1'])('rejects invalid stock %j', (stock) => {
    expect(CreateSellableUnitSchema.safeParse({ ...createInput, stock }).success).toBe(false);
    expect(UpdateSellableUnitSchema.safeParse({ stock }).success).toBe(false);
  });

  it('does not apply create defaults to partial updates', () => {
    expect(UpdateSellableUnitSchema.parse({ title: ' New title ' })).toEqual({ title: 'New title' });
    expect(UpdateSellableUnitSchema.parse({ barcode: null, priceOverride: null, costPrice: null })).toEqual({ barcode: null, priceOverride: null, costPrice: null });
    expect(UpdateSellableUnitSchema.safeParse({ productId: 'other' }).success).toBe(false);
    expect(CreateSellableUnitSchema.safeParse({ ...createInput, unexpected: true }).success).toBe(false);
  });

  it('validates attributes as string records only', () => {
    expect(CreateSellableUnitSchema.parse({ ...createInput, attributes: { color: 'Red', size: 'L' } }).attributes).toEqual({ color: 'Red', size: 'L' });
    for (const attributes of [[], { size: 1 }, { color: {} }, { color: ['red'] }, { ' ': 'red' }, { constructor: 'bad' }, { prototype: 'bad' }, { 'a\u0000': 'bad' }, { color: 'red\u0000' }, JSON.parse('{"__proto__":"bad"}')]) {
      expect(CreateSellableUnitSchema.safeParse({ ...createInput, attributes }).success, JSON.stringify(attributes)).toBe(false);
    }
  });

  it('requires unit identity and timestamps in the full domain representation', () => {
    const unit = mapProductToDefaultSellableUnit(product, identity);
    expect(SellableUnitSchema.parse(unit)).toEqual(unit);
    expect(SellableUnitSchema.safeParse({ ...unit, id: '' }).success).toBe(false);
    expect(SellableUnitSchema.safeParse({ ...unit, createdAt: 'invalid' }).success).toBe(false);
    expect(SellableUnitSchema.safeParse({ ...unit, updatedAt: undefined }).success).toBe(false);
  });
});

describe('barcode normalization', () => {
  it('normalizes scanner framing and Unicode without imposing a barcode standard', () => {
    expect(normalizeBarcode(' 001-ABC\r\n')).toBe('001-ABC');
    expect(normalizeBarcode(' Code 42 ')).toBe('Code 42');
    expect(normalizeBarcode('e\u0301')).toBe('é');
    expect(CreateSellableUnitSchema.parse({ ...createInput, barcode: ' 001-ABC\r\n' }).barcode).toBe('001-ABC');
  });

  it.each(['', ' ', 'a\u0000b', 'a\nb', 'a\u007fb', 'a\u0085b', null, 123])('rejects invalid lookup barcode %j', (barcode) => {
    expect(() => normalizeBarcode(barcode)).toThrow();
    if (barcode !== null) expect(CreateSellableUnitSchema.safeParse({ ...createInput, barcode }).success).toBe(false);
  });
});

describe('standalone compatibility mapper', () => {
  it.each([
    { source: { ...product } },
    { source: { ...product, variants: null } },
    { source: { ...product, variants: [] } },
  ])('maps exactly one default unit for standalone legacy input %#', ({ source }) => {
    const unit = mapProductToDefaultSellableUnit(source, identity);
    expect([unit]).toHaveLength(1);
    expect(unit).toEqual({
      ...identity, productId: product.id, sku: 'SKU-SERUMGLOW', title: 'Serum',
      barcode: null, priceOverride: null, costPrice: null, stock: 7, status: 'active', attributes: {},
    });
  });

  it('does not mutate a frozen product or the supplied identity', () => {
    const source = Object.freeze({ ...product, sku: 'serum-01', barcode: ' BC-01 ', costPrice: 12, attributes: { internal: 'ignored' } });
    const before = structuredClone(source);
    const frozenIdentity = Object.freeze({ ...identity });
    expect(mapProductToDefaultSellableUnit(source, frozenIdentity)).toMatchObject({ sku: 'SERUM-01', barcode: 'BC-01', costPrice: 12, attributes: {} });
    expect(source).toEqual(before);
    expect(frozenIdentity).toEqual(identity);
  });

  it.each(['draft', 'archived', 'discontinued', 'out_of_stock', undefined])('uses the frozen standalone backfill status rule for %j', (status) => {
    expect(mapProductToDefaultSellableUnit({ ...product, status }, identity).status).toBe('archived');
  });

  it('accepts snake-case legacy cost without adding a public DTO', () => {
    expect(mapProductToDefaultSellableUnit({ ...product, cost_price: 10 }, identity).costPrice).toBe(10);
  });

  it.each([null, '', 123, 'bad\u0000barcode'])('maps absent/invalid product barcodes to null: %j', (barcode) => {
    expect(mapProductToDefaultSellableUnit({ ...product, barcode }, identity).barcode).toBeNull();
  });

  it('rejects variant products and malformed variant containers', () => {
    expect(() => mapProductToDefaultSellableUnit({ ...product, variants: [{ name: 'Red', stock: 1 }] }, identity)).toThrow('without variants');
    expect(() => mapProductToDefaultSellableUnit({ ...product, variants: {} } as unknown as LegacyInventoryProduct, identity)).toThrow('without variants');
  });

  it('rejects invalid seed stock and cost instead of manufacturing usable data', () => {
    expect(() => mapProductToDefaultSellableUnit({ ...product, stock: -1 }, identity)).toThrow();
    expect(() => mapProductToDefaultSellableUnit({ ...product, cost_price: -1 }, identity)).toThrow();
    expect(() => mapProductToDefaultSellableUnit({ ...product, slug: undefined }, identity)).toThrow();
  });
});

describe('variant compatibility mapper', () => {
  it('maps one unit per variant with SKU, price, stock and safe attributes', () => {
    const variants: ProductVariant[] = [
      { id: 'red', name: 'Red', sku: 'red-01', stock: 2, price: 210, barcode: ' 0001 ', costPrice: 100, attributes: { color: 'Red' } },
      { id: 'blue', name: 'Blue', stock: 5, attributes: { color: 'Blue' } },
    ];
    const source = { ...product, variants };
    const before = structuredClone(source);
    Object.freeze(source);
    variants.forEach((variant) => { Object.freeze(variant.attributes); Object.freeze(variant); });
    Object.freeze(variants);
    const units = variants.map((variant) => mapVariantToSellableUnit(source, variant, { ...identity, id: `unit-${variant.id}` }));
    expect(units).toHaveLength(2);
    expect(units[0]).toEqual({ ...identity, id: 'unit-red', productId: product.id, sku: 'RED-01', barcode: '0001', title: 'Serum (Red)', priceOverride: 210, costPrice: 100, stock: 2, status: 'active', attributes: { color: 'Red' } });
    expect(units[1]).toEqual({ ...identity, id: 'unit-blue', productId: product.id, sku: 'SKU-SERUMGLOW-BLUE', barcode: null, title: 'Serum (Blue)', priceOverride: null, costPrice: null, stock: 5, status: 'active', attributes: { color: 'Blue' } });
    expect(source).toEqual(before);
    expect(units[0].attributes).not.toBe(variants[0].attributes);
  });

  it('supports legacy title and cost_price, explicit nulls and zero override', () => {
    const variant: ProductVariant = { name: 'Fallback', title: ' Large ', stock: 0, price: 0, cost_price: 0, barcode: null, attributes: null };
    expect(mapVariantToSellableUnit({ ...product, status: 'draft' }, variant, identity)).toMatchObject({ title: 'Serum (Large)', sku: 'SKU-SERUMGLOW-LARGE', priceOverride: 0, costPrice: 0, stock: 0, barcode: null, attributes: {}, status: 'active' });
    expect(mapVariantToSellableUnit(product, { ...variant, price: null } as unknown as ProductVariant, identity).priceOverride).toBeNull();
  });

  it('ignores undeclared legacy fields and does not stringify nested attributes', () => {
    const variant: ProductVariant = { name: 'Red', stock: 1, color: 'Red', internalPayload: { secret: 'ignored' } };
    expect(mapVariantToSellableUnit(product, variant, identity).attributes).toEqual({});
    expect(() => mapVariantToSellableUnit(product, { ...variant, attributes: { color: { name: 'Red' } } }, identity)).toThrow();
    expect(() => mapVariantToSellableUnit(product, { ...variant, attributes: [] }, identity)).toThrow();
  });

  it('rejects invalid variant seed data and handles unusable barcodes', () => {
    const variant: ProductVariant = { name: 'Red', stock: 1 };
    expect(mapVariantToSellableUnit(product, { ...variant, barcode: 123 }, identity).barcode).toBeNull();
    expect(() => mapVariantToSellableUnit(product, { ...variant, stock: -1 }, identity)).toThrow();
    expect(() => mapVariantToSellableUnit(product, { ...variant, price: -1 }, identity)).toThrow();
    expect(() => mapVariantToSellableUnit(product, { ...variant, cost_price: -1 }, identity)).toThrow();
    expect(() => mapVariantToSellableUnit(product, { ...variant, name: '' }, identity)).toThrow();
    expect(() => mapVariantToSellableUnit(product, variant, { ...identity, id: '' })).toThrow();
  });
});

describe('inventory application resolution', () => {
  function fixture(found: SellableUnit | null = mapProductToDefaultSellableUnit(product, identity)) {
    const repository: SellableUnitRepository = {
      findById: vi.fn().mockResolvedValue(found),
      findBySku: vi.fn().mockResolvedValue(found),
      findByBarcode: vi.fn().mockResolvedValue(found),
    };
    const logger = { debug: vi.fn() };
    return { repository, logger, service: new InventoryService(repository, logger), found };
  }

  it('resolves an ID through the injected repository', async () => {
    const { service, repository, found, logger } = fixture();
    expect(await service.resolveById(' unit-1 ')).toBe(found);
    expect(repository.findById).toHaveBeenCalledWith('unit-1');
    expect(logger.debug).toHaveBeenCalledWith({ lookup: 'id', found: true }, 'SellableUnit resolution');
  });

  it('resolves normalized SKU and barcode without logging values or payloads', async () => {
    const { service, repository, found, logger } = fixture();
    expect(await service.resolveBySku('serum-01')).toBe(found);
    expect(repository.findBySku).toHaveBeenCalledWith('SERUM-01');
    expect(await service.resolveByBarcode(' 001-ABC\r\n')).toBe(found);
    expect(repository.findByBarcode).toHaveBeenCalledWith('001-ABC');
    expect(logger.debug.mock.calls).toEqual([
      [{ lookup: 'sku', found: true }, 'SellableUnit resolution'],
      [{ lookup: 'barcode', found: true }, 'SellableUnit resolution'],
    ]);
  });

  it('returns null consistently for absent units', async () => {
    const { service, logger } = fixture(null);
    expect(await service.resolveById('missing')).toBeNull();
    expect(await service.resolveBySku('MISSING')).toBeNull();
    expect(await service.resolveByBarcode('missing')).toBeNull();
    expect(logger.debug.mock.calls.every(([fields]) => fields.found === false)).toBe(true);
  });

  it('works without a logger', async () => {
    const { repository, found } = fixture();
    const service = new InventoryService(repository);
    expect(await service.resolveById('unit-1')).toBe(found);
    expect(await service.resolveBySku('SKU-01')).toBe(found);
    expect(await service.resolveByBarcode('001')).toBe(found);
  });

  it('rejects invalid identifiers before accessing persistence', async () => {
    const { service, repository } = fixture();
    await expect(service.resolveById(' ')).rejects.toThrow();
    await expect(service.resolveById(null as unknown as string)).rejects.toThrow();
    await expect(service.resolveBySku('BAD SKU')).rejects.toThrow();
    await expect(service.resolveByBarcode('a\u0000b')).rejects.toThrow();
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.findBySku).not.toHaveBeenCalled();
    expect(repository.findByBarcode).not.toHaveBeenCalled();
  });

  it('propagates repository errors rather than reporting not-found', async () => {
    const { repository, service } = fixture();
    vi.mocked(repository.findById).mockRejectedValue(new Error('Persistence unavailable'));
    await expect(service.resolveById('unit-1')).rejects.toThrow('Persistence unavailable');
  });
});
