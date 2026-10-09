import type { Product, ProductVariant } from '../types/index';

const SKU_PATTERN = /^[A-Za-z0-9_-]+$/;
type SkuProduct = Pick<Product, 'slug'> & { sku?: unknown };

/** Normalize identifiers without silently accepting whitespace or punctuation. */
export function normalizeSku(value: unknown): string {
  if (typeof value !== 'string' || !SKU_PATTERN.test(value)) {
    throw new Error('SKU must be non-empty and contain only ASCII letters, digits, hyphens or underscores');
  }
  return value.toUpperCase();
}

/** Used for synthesized identifiers, never to silently repair submitted SKUs. */
export function sanitizeSku(value: unknown): string {
  if (typeof value !== 'string') throw new Error('SKU source must be a string');
  const sanitized = value.normalize('NFKD').replace(/\p{M}/gu, '').toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return normalizeSku(sanitized);
}

function existingSku(value: unknown): string | null {
  try {
    return normalizeSku(value);
  } catch {
    return null;
  }
}

export function generateDefaultSku(product: SkuProduct): string {
  const sku = existingSku(product.sku);
  if (sku) return sku;
  // DR-INV-001 migration compatibility: SKU- + sanitized uppercase slug.
  const slug = sanitizeSku(product.slug).replace(/[-_]/g, '');
  if (!slug) throw new Error('A usable product slug is required to generate a default SKU');
  return `SKU-${slug}`;
}

export function getVariantTitle(variant: ProductVariant): string {
  const title = typeof variant.title === 'string' && variant.title.trim() ? variant.title : variant.name;
  if (typeof title !== 'string' || !title.trim()) throw new Error('A variant title or name is required');
  return title.trim();
}

export function generateVariantSku(product: SkuProduct, variant: ProductVariant): string {
  const sku = existingSku(variant.sku);
  if (sku) return sku;
  // Retain the documented parent-SKU + variant-title naming convention.
  return `${generateDefaultSku(product)}-${sanitizeSku(getVariantTitle(variant))}`;
}

/** Scanner framing whitespace is removed; no external barcode standard is imposed. */
export function normalizeBarcode(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Barcode must be a string');
  const barcode = value.trim().normalize('NFC');
  if (!barcode || /[\u0000-\u001f\u007f-\u009f]/u.test(barcode)) {
    throw new Error('Barcode must be non-empty and contain no control characters');
  }
  return barcode;
}
