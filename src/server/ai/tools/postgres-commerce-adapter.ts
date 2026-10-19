import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { Product, ProductVariant } from '../../../types.js';
import type { CatalogRepository, CatalogSearchOptions } from '../../../services/meta-commerce/catalog-repository.js';
import type { AiToolContext, CommerceServiceAdapter } from './tool-types.js';
import * as schemas from './tool-schemas.js';
import { AuthoritativeCommerceAdapter } from './authoritative-commerce-adapter.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function number(value: unknown, code: string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) throw new Error(code);
  return parsed;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
function mapProduct(row: any): Product {
  const variants = Array.isArray(row.variants) ? row.variants.map((v: any) => ({ ...v,
    price: v.price === undefined || v.price === null ? undefined : number(v.price, 'INVALID_VARIANT_PRICE'),
    stock: number(v.stock, 'STOCK_UNCONFIRMED'),
  })) : [];
  return { ...row, price: number(row.price, 'PRICE_UNCONFIRMED'), stock: number(row.stock, 'STOCK_UNCONFIRMED'),
    images: Array.isArray(row.images) ? row.images : [], categories: Array.isArray(row.categories) ? row.categories : [], variants };
}

export class PostgresCatalogRepository implements CatalogRepository {
  constructor(private readonly tx: PoolClient, private readonly storeId: string) {
    if (!uuid.test(storeId)) throw new Error('VALID_STORE_ID_REQUIRED');
  }
  private columns = 'id,store_id,name,slug,description,price,stock,brand,category,categories,variants,status,images,sku';
  private async one(column: 'id' | 'slug' | 'sku', value: string): Promise<Product | null> {
    const result = await this.tx.query(`SELECT ${this.columns} FROM public.products WHERE store_id=$1 AND ${column}=$2 AND status='active' LIMIT 2`,
      [this.storeId, value]);
    if (result.rows.length !== 1) return null;
    return mapProduct(result.rows[0]);
  }
  findById(id: string) { return this.one('id', id); }
  findBySlug(slug: string) { return this.one('slug', slug.trim()); }
  findBySku(sku: string) { return this.one('sku', sku.trim()); }
  async findByMetaContentId(contentId: string): Promise<{ product: Product; variant?: ProductVariant } | null> {
    const products = await this.listActive();
    const matches: Array<{ product: Product; variant?: ProductVariant }> = [];
    for (const product of products) {
      if ([product.id, product.sku].includes(contentId)) matches.push({ product });
      for (const variant of product.variants ?? []) if ([variant.id, variant.sku].includes(contentId)) matches.push({ product, variant });
    }
    return matches.length === 1 ? matches[0] : null;
  }
  async search(query: string, options: CatalogSearchOptions = {}): Promise<Product[]> {
    const term = `%${query.trim().replace(/[%_]/g, '\\$&')}%`;
    const limit = Math.min(Math.max(options.limit ?? 10, 1), 50);
    const result = await this.tx.query(`SELECT ${this.columns} FROM public.products
      WHERE store_id=$1 AND status='active' AND ($2='' OR name ILIKE $3 ESCAPE '\\' OR COALESCE(sku,'') ILIKE $3 ESCAPE '\\'
        OR COALESCE(category,'') ILIKE $3 ESCAPE '\\')
        AND ($4::text IS NULL OR category=$4 OR categories ? $4)
      ORDER BY name,id LIMIT $5`, [this.storeId, query.trim(), term, options.category ?? null, limit]);
    return result.rows.map(mapProduct);
  }
  searchByQuery(query: string, options?: CatalogSearchOptions) { return this.search(query, options); }
  async listActive() { return this.search('', { limit: 50 }); }
  async getStock(productId: string, variantId?: string | null) {
    const product = await this.findById(productId);
    if (!product) return 0;
    if (!variantId) return number(product.stock, 'STOCK_UNCONFIRMED');
    const matches = (product.variants ?? []).filter(v => v.id === variantId || v.sku === variantId);
    return matches.length === 1 ? number(matches[0].stock, 'STOCK_UNCONFIRMED') : 0;
  }
}

export class PostgresCommerceAdapter implements CommerceServiceAdapter {
  private readonly reads: AuthoritativeCommerceAdapter;
  private readonly catalog: PostgresCatalogRepository;
  constructor(private readonly tx: PoolClient, private readonly storeId: string, private readonly conversationScope: string) {
    this.catalog = new PostgresCatalogRepository(tx, storeId);
    this.reads = new AuthoritativeCommerceAdapter(storeId, 'MXN', this.catalog, this);
  }
  searchProducts(p: unknown, c: AiToolContext) { return this.reads.searchProducts(p, c); }
  getProduct(p: unknown, c: AiToolContext) { return this.reads.getProduct(p, c); }
  getVariantStock(p: unknown, c: AiToolContext) { return this.reads.getVariantStock(p, c); }
  getPrice(p: unknown, c: AiToolContext) { return this.reads.getPrice(p, c); }
  private authorize(context: AiToolContext) {
    if (!context.isAuthenticated || context.storeId !== this.storeId || !context.userId) throw new Error('FORBIDDEN');
    return context.userId;
  }
  private async configuredOptions(type: 'deliveryOptions' | 'paymentOptions', context: AiToolContext) {
    this.authorize(context);
    const row = await this.tx.query("SELECT config->'salesAutomation'->$2 AS options FROM public.stores WHERE id=$1 AND status='active'",
      [this.storeId, type]);
    const options = row.rows[0]?.options;
    if (!Array.isArray(options) || !options.length) throw new Error(`${type.toUpperCase()}_NOT_CONFIGURED`);
    return options.filter((option: any) => option && option.enabled === true);
  }
  async getDeliveryOptions(raw: unknown, context: AiToolContext) {
    const input = schemas.GetDeliveryOptionsInputSchema.parse(raw);
    const options = (await this.configuredOptions('deliveryOptions', context)).map((o: any) => ({
      id: String(o.id), name: String(o.name), estimatedDays: String(o.estimatedDays),
      cost: number(o.cost, 'DELIVERY_COST_UNCONFIRMED'), currency: 'MXN',
      ...(o.freeThreshold === undefined ? {} : { freeThreshold: number(o.freeThreshold, 'INVALID_FREE_THRESHOLD') }),
    }));
    if (!options.length) throw new Error('DELIVERY_OPTIONS_NOT_CONFIGURED');
    return { destination: { postalCode: input.postalCode, city: input.city, country: input.country }, options };
  }
  async getPaymentOptions(raw: unknown, context: AiToolContext) {
    const input = schemas.GetPaymentOptionsInputSchema.parse(raw);
    const methods = (await this.configuredOptions('paymentOptions', context)).map((o: any) => ({
      method: String(o.id), name: String(o.name), description: String(o.description ?? ''), supported: true,
      secureRedirectOnly: o.secureRedirectOnly !== false,
    }));
    if (!methods.length) throw new Error('PAYMENT_OPTIONS_NOT_CONFIGURED');
    return { currency: input.currency, methods, paymentCaptureSupportedByAi: false as const,
      securityNotice: 'El pago se completa fuera del chat mediante el flujo oficial de la tienda.' };
  }
  private async idempotent<T>(tool: string, key: string, payload: unknown, context: AiToolContext, action: () => Promise<T>): Promise<T> {
    const customer = this.authorize(context);
    const scope = `${this.storeId}:${customer}:${tool}:${key}`;
    await this.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [scope]);
    const hash = createHash('sha256').update(canonical(payload)).digest('hex');
    const existing = await this.tx.query(`SELECT payload_hash,result FROM relic_messaging.tool_idempotency
      WHERE store_id=$1 AND customer_key=$2 AND tool_name=$3 AND idempotency_key=$4`, [this.storeId, customer, tool, key]);
    if (existing.rows.length) {
      if (existing.rows[0].payload_hash !== hash) throw new Error('IDEMPOTENCY_CONFLICT');
      return existing.rows[0].result as T;
    }
    const result = await action();
    await this.tx.query(`INSERT INTO relic_messaging.tool_idempotency
      (store_id,customer_key,tool_name,idempotency_key,payload_hash,result) VALUES ($1,$2,$3,$4,$5,$6)`,
    [this.storeId, customer, tool, key, hash, JSON.stringify(result)]);
    return result;
  }
  private async resolveItem(item: { productId: string; variantName?: string; quantity: number }, lock = false) {
    const row = await this.tx.query(`SELECT id,name,price,stock,variants,images,status FROM public.products
      WHERE id=$1 AND store_id=$2 AND status='active' ${lock ? 'FOR UPDATE' : ''}`, [item.productId, this.storeId]);
    if (row.rows.length !== 1) throw new Error('PRODUCT_UNAVAILABLE');
    const product = mapProduct(row.rows[0]);
    const variants = product.variants ?? [];
    let variant: ProductVariant | undefined;
    if (variants.length) {
      if (!item.variantName) throw new Error('VARIANT_SELECTION_REQUIRED');
      const matches = variants.filter(v => v.name === item.variantName || v.id === item.variantName || v.sku === item.variantName);
      if (matches.length !== 1) throw new Error('VARIANT_AMBIGUOUS_OR_MISSING');
      variant = matches[0];
    }
    const available = number(variant?.stock ?? product.stock, 'STOCK_UNCONFIRMED');
    if (available < item.quantity) throw new Error('INSUFFICIENT_STOCK');
    const unitPrice = number(variant?.price ?? product.price, 'PRICE_UNCONFIRMED');
    return { product, variant, unitPrice, available };
  }
  async createCart(raw: unknown, context: AiToolContext) {
    const input = schemas.CreateCartInputSchema.parse(raw);
    return this.idempotent('create_cart', input.idempotencyKey, input, context, async () => {
      const items = [];
      for (const item of input.items) {
        const resolved = await this.resolveItem(item);
        items.push({ productId: resolved.product.id, variantId: resolved.variant?.id ?? null,
          variantName: resolved.variant?.name ?? null, name: resolved.product.name, quantity: item.quantity,
          unitPrice: resolved.unitPrice });
      }
      const id = `cart_${randomUUID()}`; const correlationId = context.correlationId ?? randomUUID();
      await this.tx.query(`INSERT INTO relic_messaging.carts
        (id,store_id,customer_key,conversation_scope,items,correlation_id) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, this.storeId, context.userId, this.conversationScope, JSON.stringify(items), correlationId]);
      return { cartId: id, itemsCount: items.reduce((n, i) => n + i.quantity, 0),
        subtotal: items.reduce((n, i) => n + i.quantity * i.unitPrice, 0), currency: 'MXN', createdAt: new Date().toISOString() };
    });
  }
  async updateCart(raw: unknown, context: AiToolContext) {
    const input = schemas.UpdateCartInputSchema.parse(raw);
    return this.idempotent('update_cart', input.idempotencyKey, input, context, async () => {
      const row = await this.tx.query(`SELECT items FROM relic_messaging.carts
        WHERE id=$1 AND store_id=$2 AND customer_key=$3 AND status='active' FOR UPDATE`, [input.cartId, this.storeId, context.userId]);
      if (row.rows.length !== 1) throw new Error('CART_NOT_FOUND');
      let items: any[] = row.rows[0].items;
      if (input.action === 'clear') items = [];
      else if (input.item) {
        const resolved = await this.resolveItem(input.item);
        const index = items.findIndex(i => i.productId === resolved.product.id && i.variantName === (resolved.variant?.name ?? null));
        if (input.action === 'add_item') {
          const quantity = (index >= 0 ? items[index].quantity : 0) + input.item.quantity;
          if (resolved.available < quantity) throw new Error('INSUFFICIENT_STOCK');
          const next = { productId: resolved.product.id, variantId: resolved.variant?.id ?? null,
            variantName: resolved.variant?.name ?? null, name: resolved.product.name, quantity, unitPrice: resolved.unitPrice };
          index >= 0 ? items[index] = next : items.push(next);
        } else if (input.action === 'remove_item') { if (index < 0) throw new Error('CART_ITEM_NOT_FOUND'); items.splice(index, 1); }
        else if (input.action === 'update_quantity') {
          if (index < 0) throw new Error('CART_ITEM_NOT_FOUND');
          if (input.item.quantity <= 0) items.splice(index, 1); else items[index] = { ...items[index], quantity: input.item.quantity, unitPrice: resolved.unitPrice };
        }
      }
      await this.tx.query('UPDATE relic_messaging.carts SET items=$2,updated_at=now() WHERE id=$1', [input.cartId, JSON.stringify(items)]);
      return { cartId: input.cartId, items, itemsCount: items.reduce((n, i) => n + i.quantity, 0),
        subtotal: items.reduce((n, i) => n + i.quantity * i.unitPrice, 0), currency: 'MXN', updatedAt: new Date().toISOString() };
    });
  }
  async createOrderDraft(raw: unknown, context: AiToolContext) {
    const input = schemas.CreateOrderDraftInputSchema.parse(raw);
    if (!input.customerConfirmed) throw new Error('EXPLICIT_CONFIRMATION_REQUIRED');
    return this.idempotent('create_order_draft', input.idempotencyKey, input, context, async () => {
      let requested: Array<{ productId: string; variantName?: string; quantity: number }>;
      if (input.cartId) {
        const cart = await this.tx.query(`SELECT items FROM relic_messaging.carts WHERE id=$1 AND store_id=$2
          AND customer_key=$3 AND status='active' FOR UPDATE`, [input.cartId, this.storeId, context.userId]);
        if (cart.rows.length !== 1 || !cart.rows[0].items.length) throw new Error('CART_NOT_FOUND');
        requested = cart.rows[0].items.map((i: any) => ({ productId: i.productId, variantName: i.variantName ?? undefined, quantity: i.quantity }));
      } else requested = input.items!;
      const items = [];
      for (const item of requested) {
        const resolved = await this.resolveItem(item, true);
        items.push({ product: resolved.product, variant: resolved.variant, quantity: item.quantity, unitPrice: resolved.unitPrice });
      }
      const subtotal = items.reduce((n, i) => n + i.quantity * i.unitPrice, 0);
      await this.tx.query('SAVEPOINT create_order_draft_insert');
      let order;
      try {
        order = await this.tx.query(`INSERT INTO public.orders
          (store_id,customer_email,status,subtotal,total,currency,discount_amount,notes)
          VALUES ($1,$2,'pendiente',$3,$3,'mxn',0,$4) RETURNING id,created_at`,
        [this.storeId, input.customerEmail, subtotal, `sales-automation:${context.correlationId ?? 'none'}`]);
      } catch (error: any) {
        await this.tx.query('ROLLBACK TO SAVEPOINT create_order_draft_insert');
        if (error?.code !== '23505' || !input.cartId) throw error;
        const existing = await this.tx.query(`SELECT o.id,o.created_at,o.customer_email,o.total
          FROM public.orders o JOIN relic_messaging.order_links l ON l.order_id=o.id
          WHERE l.store_id=$1 AND l.cart_id=$2 AND l.customer_key=$3
          ORDER BY o.created_at ASC LIMIT 1`, [this.storeId, input.cartId, context.userId]);
        if (existing.rows.length !== 1) throw error;
        const row = existing.rows[0];
        return { draftOrderId: row.id, status: 'draft' as const, customerEmail: row.customer_email,
          subtotal: number(row.total, 'INVALID_ORDER_TOTAL'), discountAmount: 0, shippingCost: 0,
          total: number(row.total, 'INVALID_ORDER_TOTAL'), currency: 'MXN', checkoutUrl: `/checkout?order_id=${row.id}`,
          paymentStatus: 'unpaid' as const, requiresCustomerPaymentConfirmation: true as const,
          createdAt: row.created_at.toISOString(), alreadyExists: true as const };
      }
      for (const item of items) await this.tx.query(`INSERT INTO public.order_items
        (order_id,product_id,quantity,unit_price,product_snapshot) VALUES ($1,$2,$3,$4,$5)`,
      [order.rows[0].id, item.product.id, item.quantity, item.unitPrice, JSON.stringify({ id: item.product.id,
        name: item.product.name, variantName: item.variant?.name ?? null, sku: item.variant?.sku ?? item.product.sku ?? null,
        price: item.unitPrice, images: item.product.images })]);
      await this.tx.query(`INSERT INTO relic_messaging.order_links
        (order_id,store_id,customer_key,conversation_scope,cart_id,idempotency_key,correlation_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`, [order.rows[0].id, this.storeId, context.userId, this.conversationScope,
      input.cartId ?? null, input.idempotencyKey, context.correlationId ?? randomUUID()]);
      if (input.cartId) await this.tx.query("UPDATE relic_messaging.carts SET status='converted',updated_at=now() WHERE id=$1", [input.cartId]);
      return { draftOrderId: order.rows[0].id, status: 'draft' as const, customerEmail: input.customerEmail,
        subtotal, discountAmount: 0, shippingCost: 0, total: subtotal, currency: 'MXN',
        checkoutUrl: `/checkout?order_id=${order.rows[0].id}`, paymentStatus: 'unpaid' as const,
        requiresCustomerPaymentConfirmation: true as const, createdAt: order.rows[0].created_at.toISOString() };
    });
  }
  async getOrderStatus(raw: unknown, context: AiToolContext) {
    const input = schemas.GetOrderStatusInputSchema.parse(raw); this.authorize(context);
    const order = await this.tx.query(`SELECT o.id,o.status,o.created_at,o.total,o.currency,o.tracking_number
      FROM public.orders o JOIN relic_messaging.order_links l ON l.order_id=o.id
      WHERE o.id=$1 AND o.store_id=$2 AND l.customer_key=$3 AND lower(o.customer_email)=lower($4)`,
    [input.orderId, this.storeId, context.userId, input.customerEmail]);
    if (order.rows.length !== 1) throw new Error('ORDER_NOT_FOUND');
    const items = await this.tx.query(`SELECT product_snapshot->>'name' AS name,quantity,unit_price FROM public.order_items WHERE order_id=$1 ORDER BY id`, [input.orderId]);
    const o = order.rows[0];
    return { orderId: o.id, status: o.status, createdAt: o.created_at.toISOString(), total: number(o.total, 'INVALID_ORDER_TOTAL'),
      currency: String(o.currency).toUpperCase(), carrier: null, trackingNumber: o.tracking_number, trackingUrl: null,
      items: items.rows.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: number(i.unit_price, 'INVALID_ORDER_PRICE') })) };
  }
  async requestHumanHandoff(raw: unknown, context: AiToolContext) {
    const input = schemas.RequestHumanHandoffInputSchema.parse(raw);
    return this.idempotent('request_human_handoff', input.idempotencyKey, input, context, async () => ({
      ticketId: `handoff_${randomUUID()}`, status: 'pending_human_agent' as const, priority: input.priority,
      reason: input.reason, estimatedWaitMinutes: 0, handoffTimestamp: new Date().toISOString(),
      confirmationMessage: 'La automatizacion se detuvo para esta conversacion. Un asesor revisara el caso.',
    }));
  }
}
