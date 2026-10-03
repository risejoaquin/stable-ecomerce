import { z } from 'zod';
import type { Product, ProductVariant } from './index';
import { generateDefaultSku, generateVariantSku, getVariantTitle, normalizeBarcode, normalizeSku } from '../utils/sku-helpers';

export const SellableUnitStatusSchema = z.enum(['active', 'archived', 'discontinued']);
export type SellableUnitStatus = z.infer<typeof SellableUnitStatusSchema>;

/** Internal inventory domain entity. Never use this as a public storefront DTO. */
export interface SellableUnit {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  title: string;
  priceOverride: number | null;
  costPrice: number | null;
  stock: number;
  status: SellableUnitStatus;
  attributes: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const text = z.string().trim().min(1);
const skuSchema = z.string().min(1).regex(/^[A-Za-z0-9_-]+$/).transform((value) => normalizeSku(value));
const barcodeSchema = z.string().transform((value, context) => {
  try {
    return normalizeBarcode(value);
  } catch {
    context.addIssue({ code: 'custom', message: 'Invalid barcode' });
    return z.NEVER;
  }
}).nullable();
const moneySchema = z.number().finite().nonnegative().nullable();
const attributeKeySchema = z.string().min(1).refine(
  (key) => key.trim().length > 0 && !['__proto__', 'constructor', 'prototype'].includes(key) && !/[\u0000-\u001f\u007f-\u009f]/u.test(key),
  'Invalid attribute key',
);
// Check own keys before Zod's record parser can discard prototype-related keys.
const attributesSchema = z.custom<Record<string, string>>((value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return (prototype === Object.prototype || prototype === null)
    && Reflect.ownKeys(value).every((key) => typeof key === 'string' && attributeKeySchema.safeParse(key).success);
}, 'Invalid attribute record').pipe(z.record(
  attributeKeySchema,
  z.string().refine((value) => !/[\u0000-\u001f\u007f-\u009f]/u.test(value), 'Invalid attribute value'),
));

const inputSchema = z.object({
  productId: text,
  sku: skuSchema,
  barcode: barcodeSchema,
  title: text,
  priceOverride: moneySchema,
  costPrice: moneySchema,
  stock: z.number().int().nonnegative(),
  status: SellableUnitStatusSchema,
  attributes: attributesSchema,
}).strict();

export const SellableUnitSchema = inputSchema.extend({
  id: text,
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
}).transform((unit): SellableUnit => ({
  id: unit.id,
  productId: unit.productId,
  sku: unit.sku,
  barcode: unit.barcode,
  title: unit.title,
  priceOverride: unit.priceOverride,
  costPrice: unit.costPrice,
  stock: unit.stock,
  status: unit.status,
  attributes: unit.attributes,
  createdAt: unit.createdAt,
  updatedAt: unit.updatedAt,
}));

export const SellableUnitInputSchema = inputSchema.extend({
  barcode: barcodeSchema.default(null),
  priceOverride: moneySchema.default(null),
  costPrice: moneySchema.default(null),
  stock: inputSchema.shape.stock.default(0),
  status: SellableUnitStatusSchema.default('active'),
  attributes: attributesSchema.default({}),
});
export const CreateSellableUnitSchema = SellableUnitInputSchema;
export const UpdateSellableUnitSchema = inputSchema.omit({ productId: true }).partial();
export type SellableUnitInput = Pick<SellableUnit, 'productId' | 'sku' | 'title'>
  & Partial<Pick<SellableUnit, 'barcode' | 'priceOverride' | 'costPrice' | 'stock' | 'status' | 'attributes'>>;
export type CreateSellableUnitInput = SellableUnitInput;
export type UpdateSellableUnitInput = Partial<Omit<SellableUnitInput, 'productId'>>;

/** Persistence supplies identity/timestamps; mappers never invent database IDs. */
export interface SellableUnitMappingIdentity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type LegacyInventoryProduct = Pick<Product, 'id' | 'name' | 'stock' | 'slug' | 'status'> & {
  variants?: ProductVariant[] | null;
  [key: string]: unknown;
};

function sourceBarcode(value: unknown): string | null {
  const result = barcodeSchema.safeParse(value ?? null);
  return result.success ? result.data : null;
}

export function mapProductToDefaultSellableUnit(product: LegacyInventoryProduct, identity: SellableUnitMappingIdentity): SellableUnit {
  if (product.variants != null && (!Array.isArray(product.variants) || product.variants.length > 0)) {
    throw new Error('Default SellableUnit mapping requires a product without variants');
  }
  return SellableUnitSchema.parse({
    ...identity,
    productId: product.id,
    sku: generateDefaultSku(product),
    barcode: sourceBarcode(product.barcode),
    title: product.name,
    priceOverride: null,
    costPrice: product.costPrice ?? product.cost_price ?? null,
    // Compatibility seed only; legacy product stock is not transactional authority.
    stock: product.stock,
    status: product.status === 'active' ? 'active' : 'archived',
    attributes: {},
  });
}

export function mapVariantToSellableUnit(product: LegacyInventoryProduct, variant: ProductVariant, identity: SellableUnitMappingIdentity): SellableUnit {
  return SellableUnitSchema.parse({
    ...identity,
    productId: product.id,
    sku: generateVariantSku(product, variant),
    barcode: sourceBarcode(variant.barcode),
    title: `${product.name} (${getVariantTitle(variant)})`,
    priceOverride: variant.price ?? null,
    costPrice: variant.costPrice ?? variant.cost_price ?? null,
    // DR-INV-001 migration compatibility, not a stock mutation mechanism.
    stock: variant.stock,
    status: 'active',
    // Only explicitly declared attributes; never serialize arbitrary legacy JSON.
    attributes: variant.attributes ?? {},
  });
}
