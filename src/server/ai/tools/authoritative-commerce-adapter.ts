import type { CatalogRepository } from '../../../services/meta-commerce/catalog-repository.js';
import type { AiToolContext, CommerceServiceAdapter } from './tool-types.js';
import * as schemas from './tool-schemas.js';

type Operations = Pick<CommerceServiceAdapter, 'getDeliveryOptions' | 'getPaymentOptions' | 'createCart' |
  'updateCart' | 'createOrderDraft' | 'getOrderStatus' | 'requestHumanHandoff'>;

/** Repository must be scoped by the server to this store. No fallback to fixture data. */
export class AuthoritativeCommerceAdapter implements CommerceServiceAdapter {
  constructor(private readonly storeId: string, private readonly currency: string,
    private readonly catalog: CatalogRepository, private readonly operations: Operations) {
    if (!storeId || !currency) throw new Error('STORE_CONFIGURATION_REQUIRED');
  }
  private authorize(context: AiToolContext) {
    if (!context.isAuthenticated || !context.userId || context.storeId !== this.storeId) throw new Error('FORBIDDEN');
  }
  private async product(id: string, context: AiToolContext) {
    this.authorize(context);
    const product = await this.catalog.findById(id);
    if (!product || product.status !== 'active') throw new Error('PRODUCT_UNAVAILABLE');
    if (!Number.isFinite(product.price) || product.price < 0) throw new Error('INVALID_CATALOG_PRICE');
    return product;
  }
  private variant(product: Awaited<ReturnType<AuthoritativeCommerceAdapter['product']>>, name?: string, sku?: string) {
    const variants = product.variants ?? [];
    if (!name && !sku) {
      if (variants.length) throw new Error('VARIANT_SELECTION_REQUIRED');
      return undefined;
    }
    const matches = variants.filter(v => (!name || v.name === name) && (!sku || v.sku === sku));
    if (matches.length !== 1) throw new Error('VARIANT_AMBIGUOUS_OR_MISSING');
    return matches[0];
  }
  private stock(value: unknown): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new Error('STOCK_UNCONFIRMED');
    return value;
  }
  async searchProducts(raw: unknown, context: AiToolContext) {
    this.authorize(context);
    const input = schemas.SearchProductsInputSchema.parse(raw);
    const rows = await this.catalog.search(input.query, { category: input.category, limit: input.limit, activeOnly: true });
    const products = rows.filter(p => p.status === 'active' && Number.isFinite(p.price) && p.price >= 0 &&
      (input.minPrice === undefined || p.price >= input.minPrice) && (input.maxPrice === undefined || p.price <= input.maxPrice))
      .map(p => ({ id: p.id, name: p.name, slug: p.slug ?? undefined, price: p.price, currency: this.currency,
        inStock: this.stock(p.stock) > 0, category: p.category ?? undefined, description: p.description ?? undefined }));
    return { products, totalCount: products.length, query: input.query };
  }
  async getProduct(raw: unknown, context: AiToolContext) {
    const { productId } = schemas.GetProductInputSchema.parse(raw);
    const p = await this.product(productId, context);
    return { product: { id: p.id, name: p.name, slug: p.slug ?? undefined, description: p.description ?? undefined,
      price: p.price, currency: this.currency, stock: this.stock(p.stock), inStock: this.stock(p.stock) > 0,
      status: p.status, variants: (p.variants ?? []).map(v => ({ id: v.id, name: v.name, sku: v.sku,
        price: v.price, stock: this.stock(v.stock), inStock: this.stock(v.stock) > 0 })), images: p.images ?? [] } };
  }
  async getVariantStock(raw: unknown, context: AiToolContext) {
    const input = schemas.GetVariantStockInputSchema.parse(raw);
    const p = await this.product(input.productId, context);
    const v = this.variant(p, input.variantName, input.sku);
    const availableQuantity = this.stock(v ? v.stock : p.stock);
    return { productId: p.id, variantName: v?.name, sku: v?.sku ?? undefined,
      inStock: availableQuantity > 0, stockLevel: availableQuantity > 0 ? 'in_stock' : 'out_of_stock',
      availableQuantity, message: availableQuantity > 0 ? 'Disponibilidad confirmada por catalogo.' : 'Agotado.' };
  }
  async getPrice(raw: unknown, context: AiToolContext) {
    const input = schemas.GetPriceInputSchema.parse(raw);
    if (input.couponCode) throw new Error('PROMOTION_VERIFICATION_REQUIRED');
    const p = await this.product(input.productId, context);
    const v = this.variant(p, input.variantName);
    const unitPrice = v?.price ?? p.price;
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new Error('PRICE_UNCONFIRMED');
    const subtotal = Math.round(unitPrice * input.quantity * 100) / 100;
    return { productId: p.id, unitPrice, quantity: input.quantity, subtotal, discountAmount: 0,
      finalTotal: subtotal, currency: this.currency, couponApplied: false };
  }
  async getDeliveryOptions(p: unknown, c: AiToolContext) { this.authorize(c); return this.operations.getDeliveryOptions(p, c); }
  async getPaymentOptions(p: unknown, c: AiToolContext) { this.authorize(c); return this.operations.getPaymentOptions(p, c); }
  async createCart(p: unknown, c: AiToolContext) { this.authorize(c); return this.operations.createCart(p, c); }
  async updateCart(p: unknown, c: AiToolContext) { this.authorize(c); return this.operations.updateCart(p, c); }
  async createOrderDraft(p: unknown, c: AiToolContext) { this.authorize(c); return this.operations.createOrderDraft(p, c); }
  async getOrderStatus(p: unknown, c: AiToolContext) { this.authorize(c); return this.operations.getOrderStatus(p, c); }
  async requestHumanHandoff(p: unknown, c: AiToolContext) { this.authorize(c); return this.operations.requestHumanHandoff(p, c); }
}
