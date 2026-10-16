/**
 * Pre-cutover defense-in-depth for the legacy web order and Stripe checkout.
 * Not an inventory mutation / reservation. DR-INV-001's sellable_units RPC
 * remains the only valid stock authority after canonical cutover.
 */
export class LegacyOrderValidationError extends Error {
  constructor(message: string, public readonly status = 409) {
    super(message);
    this.name = 'LegacyOrderValidationError';
  }
}
type CatalogProduct = {
  id: string;
  name: string;
  sku?: string | null;
  price: number | string;
  stock: number | string;
  status?: string;
  variants?: unknown;
};

type RequestedSelection = {
  variantName?: unknown;
  sku?: unknown;
};
type Variant = { name?: unknown; sku?: unknown; price?: unknown; stock?: unknown };

export interface LegacyCatalogLine {
  key: string;
  sku: string | null;
  variantName: string | null;
  displayName: string;
  unitPrice: number;
  available: number;
}

function normalized(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLocaleLowerCase('en-US') : '';
}

function money(value: unknown): number {
  if (value === null || value === undefined || typeof value === 'boolean' || value === '') {
    throw new LegacyOrderValidationError('Invalid catalog price');
  }
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0 || Math.abs(price * 100 - Math.round(price * 100)) > 1e-6) {
    throw new LegacyOrderValidationError('Invalid catalog price');
  }
  return price;
}

function inventory(value: unknown): number {
  const stock = Number(value);
  if (value === null || value === undefined || !Number.isSafeInteger(stock) || stock < 0) {
    throw new LegacyOrderValidationError('Invalid inventory value');
  }
  return stock;
}

export function enforcePrimaryStoreScope(requestedStoreId: unknown, primaryStoreId: string): string {
  if (!primaryStoreId || typeof primaryStoreId !== 'string') {
    throw new LegacyOrderValidationError('Primary store is not configured', 503);
  }
  if (requestedStoreId !== null && requestedStoreId !== undefined && requestedStoreId !== '' &&
      requestedStoreId !== primaryStoreId) {
    throw new LegacyOrderValidationError('Store is not available', 403);
  }
  return primaryStoreId;
}

export function resolveLegacyCatalogLine(product: CatalogProduct, requested: RequestedSelection): LegacyCatalogLine {
  if (!product || typeof product.id !== 'string' || !product.id ||
      typeof product.name !== 'string' || !product.name) {
    throw new LegacyOrderValidationError('Product is unavailable');
  }
  const variants: Variant[] = Array.isArray(product.variants) ? product.variants : [];
  const variantName = normalized(requested.variantName);
  const sku = normalized(requested.sku);
  const baseSku = normalized(product.sku);
  let selected: Variant | undefined;

  if (variants.length) {
    // A parent SKU alone cannot identify a specific variant.
    const matchSku = sku && sku !== baseSku ? sku : '';
    if (!variantName && !matchSku) {
      throw new LegacyOrderValidationError('Select a product variant before checkout');
    }
    const matching = variants.filter((entry) => {
      const matchesName = variantName && normalized(entry.name) === variantName;
      const matchesSku = matchSku && normalized(entry.sku) === matchSku;
      if (variantName && matchSku) return Boolean(matchesName && matchesSku);
      return Boolean(matchesName || matchesSku);
    });
    if (matching.length !== 1) {
      throw new LegacyOrderValidationError('Variant not found or selection is ambiguous');
    }
    selected = matching[0];
  } else {
    if (variantName || (sku && sku !== baseSku)) {
      throw new LegacyOrderValidationError('Unknown product variant');
    }
  }

  const resolvedSku = typeof selected?.sku === 'string' && selected.sku.trim()
    ? selected.sku.trim() : typeof product.sku === 'string' && product.sku.trim() ? product.sku.trim() : null;
  const resolvedName = selected ? String(selected.name || '').trim() : null;
  const unitPrice = money(selected?.price ?? product.price);
  const available = inventory(selected ? selected.stock : product.stock);
  return {
    key: selected ? `variant:${normalized(resolvedSku) || normalized(resolvedName)}` : 'base',
    sku: resolvedSku,
    variantName: resolvedName,
    displayName: resolvedName ? `${product.name} - ${resolvedName}` : product.name,
    unitPrice,
    available
  };
}

export function reserveLegacyLine(
  reservations: Map<string, { requested: number; available: number }>,
  productId: string,
  selection: LegacyCatalogLine,
  quantity: unknown
): void {
  if (!Number.isSafeInteger(quantity) || (quantity as number) <= 0) {
    throw new LegacyOrderValidationError('Invalid item quantity', 400);
  }
  const key = `${productId}::${selection.key}`;
  const prior = reservations.get(key);
  const total = (prior?.requested ?? 0) + (quantity as number);
  if (!Number.isSafeInteger(total) || total > selection.available ||
      (prior && prior.available !== selection.available)) {
    throw new LegacyOrderValidationError('Insufficient stock for selected item');
  }
  reservations.set(key, { requested: total, available: selection.available });
}
