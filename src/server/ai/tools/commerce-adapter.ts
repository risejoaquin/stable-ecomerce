/**
 * Google AI Customer Care - Commerce Service Adapter
 *
 * Implements the typed backend abstraction for all 11 restricted AI tools.
 * Decouples the AI layer from direct database queries and payment capture.
 *
 * Invariants:
 * - DIRECT_DB_AUTHORITY=NO (AI never interacts directly with raw DB/SQL)
 * - PAYMENT_CAPTURE_AUTHORITY=NO (Only draft creation allowed; no capture)
 */

import type { AiToolContext, CommerceServiceAdapter } from './tool-types.js';
import type {
  SearchProductsInput,
  SearchProductsOutput,
  GetProductInput,
  GetProductOutput,
  GetVariantStockInput,
  GetVariantStockOutput,
  GetPriceInput,
  GetPriceOutput,
  GetDeliveryOptionsInput,
  GetDeliveryOptionsOutput,
  GetPaymentOptionsInput,
  GetPaymentOptionsOutput,
  CreateCartInput,
  CreateCartOutput,
  UpdateCartInput,
  UpdateCartOutput,
  CreateOrderDraftInput,
  CreateOrderDraftOutput,
  GetOrderStatusInput,
  GetOrderStatusOutput,
  RequestHumanHandoffInput,
  RequestHumanHandoffOutput,
} from './tool-schemas.js';

// ============================================================================
// Default In-Memory Mock Commerce Catalog
// ============================================================================
export interface MockProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  currency: string;
  stock: number;
  status: string;
  category: string;
  variants: Array<{
    id?: string;
    name: string;
    sku?: string | null;
    price?: number | null;
    stock: number;
  }>;
  images: string[];
}

export const SEED_PRODUCTS: MockProductData[] = [
  {
    id: 'prod-001',
    name: 'Sérum Reparador Nocturno RELIC',
    slug: 'serum-reparador-nocturno',
    description: 'Tratamiento intensivo regenerador con ácido hialurónico puro y niacinamida 5%.',
    price: 850,
    compareAtPrice: 990,
    currency: 'MXN',
    stock: 25,
    status: 'active',
    category: 'serums',
    variants: [
      { id: 'var-001-30ml', name: '30 ml', sku: 'SER-REP-30', price: 850, stock: 15 },
      { id: 'var-001-50ml', name: '50 ml', sku: 'SER-REP-50', price: 1250, stock: 10 },
    ],
    images: ['https://selfcaresinners.com/images/serum-nocturno.jpg'],
  },
  {
    id: 'prod-002',
    name: 'Limpiador Facial Botánico Purificante',
    slug: 'limpiador-facial-botanico',
    description: 'Gel suave equilibrante con extracto de té verde y centella asiática.',
    price: 490,
    compareAtPrice: 550,
    currency: 'MXN',
    stock: 40,
    status: 'active',
    category: 'limpiadores',
    variants: [
      { id: 'var-002-150ml', name: '150 ml', sku: 'LIMP-BOT-150', price: 490, stock: 40 },
    ],
    images: ['https://selfcaresinners.com/images/limpiador-botanico.jpg'],
  },
  {
    id: 'prod-003',
    name: 'Crema Hidratante Barrera Ceramidas',
    slug: 'crema-hidratante-barrera',
    description: 'Crema reparadora de barrera cutánea con 3 ceramidas esenciales y péptidos.',
    price: 720,
    compareAtPrice: 800,
    currency: 'MXN',
    stock: 5, // low stock
    status: 'active',
    category: 'hidratantes',
    variants: [
      { id: 'var-003-50ml', name: '50 ml', sku: 'CREM-BAR-50', price: 720, stock: 5 },
    ],
    images: ['https://selfcaresinners.com/images/crema-barrera.jpg'],
  },
  {
    id: 'prod-004',
    name: 'Protector Solar Fluido Mineral SPF 50+',
    slug: 'protector-solar-mineral-spf50',
    description: 'Protección de amplio espectro UVA/UVB acabado mate sin residuo blanco.',
    price: 680,
    compareAtPrice: null,
    currency: 'MXN',
    stock: 0, // out of stock
    status: 'active',
    category: 'proteccion-solar',
    variants: [
      { id: 'var-004-50ml', name: '50 ml', sku: 'FPS-MIN-50', price: 680, stock: 0 },
    ],
    images: ['https://selfcaresinners.com/images/protector-solar.jpg'],
  },
];

export interface MockOrderRecord {
  storeId: string;
  userId: string;
  id: string;
  customerEmail: string;
  status: string;
  total: number;
  currency: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  createdAt: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  timeline: Array<{ event: string; timestamp: string }>;
}

export const SEED_ORDERS: MockOrderRecord[] = [
  {
    id: 'ord-1001',
    storeId: 'store-001',
    userId: 'customer-001',
    customerEmail: 'cliente@example.com',
    status: 'enviado',
    total: 1340,
    currency: 'MXN',
    carrier: 'Estafeta',
    trackingNumber: 'EST-9876543210',
    trackingUrl: 'https://rastreo.estafeta.com?guide=EST-9876543210',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    items: [
      { name: 'Sérum Reparador Nocturno RELIC - 30 ml', quantity: 1, unitPrice: 850 },
      { name: 'Limpiador Facial Botánico Purificante', quantity: 1, unitPrice: 490 },
    ],
    timeline: [
      { event: 'Orden confirmada y pagada', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
      { event: 'Empacado en almacén central', timestamp: new Date(Date.now() - 86400000).toISOString() },
      { event: 'En tránsito con Estafeta', timestamp: new Date(Date.now() - 43200000).toISOString() },
    ],
  },
];

// ============================================================================
// Hermetic In-Memory Commerce Adapter (Default / Test / Offline CI)
// ============================================================================
export class InMemoryCommerceAdapter implements CommerceServiceAdapter {
  private cartOwners = new Map<string, string>();

  private owner(context: AiToolContext): string {
    if (!context.isAuthenticated || !context.storeId || !context.userId) throw new Error('FORBIDDEN');
    return JSON.stringify([context.storeId, context.userId]);
  }

  private assertCartOwner(cartId: string, context: AiToolContext): void {
    if (this.cartOwners.get(cartId) !== this.owner(context)) throw new Error('FORBIDDEN');
  }
  private products: Map<string, MockProductData>;
  private carts: Map<string, { id: string; customerEmail?: string; items: any[]; createdAt: string; updatedAt: string }>;
  private orders: Map<string, MockOrderRecord>;
  private drafts: Map<string, any>;
  private handoffTickets: Map<string, any>;
  private simulatedErrors: Map<string, Error>;

  constructor(initialProducts: MockProductData[] = SEED_PRODUCTS, initialOrders: MockOrderRecord[] = SEED_ORDERS) {
    this.products = new Map();
    for (const p of initialProducts) {
      this.products.set(p.id, { ...p });
      this.products.set(p.slug, { ...p });
    }
    this.carts = new Map();
    this.orders = new Map();
    for (const o of initialOrders) {
      this.orders.set(o.id, { ...o });
    }
    this.drafts = new Map();
    this.handoffTickets = new Map();
    this.simulatedErrors = new Map();
  }

  public simulateError(toolName: string, error: Error): void {
    this.simulatedErrors.set(toolName, error);
  }

  public clearSimulatedError(toolName: string): void {
    this.simulatedErrors.delete(toolName);
  }

  private checkSimulatedError(toolName: string): void {
    const err = this.simulatedErrors.get(toolName);
    if (err) throw err;
  }

  // 1. search_products
  async searchProducts(input: SearchProductsInput, _context: AiToolContext): Promise<SearchProductsOutput> {
    this.checkSimulatedError('search_products');
    const q = input.query.toLowerCase().trim();
    const seen = new Set<string>();
    const matches: MockProductData[] = [];

    for (const p of this.products.values()) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);

      if (p.status !== 'active') continue;
      if (input.category && p.category.toLowerCase() !== input.category.toLowerCase()) continue;
      if (input.minPrice !== undefined && p.price < input.minPrice) continue;
      if (input.maxPrice !== undefined && p.price > input.maxPrice) continue;

      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.description.toLowerCase().includes(q);
      const catMatch = p.category.toLowerCase().includes(q);

      if (nameMatch || descMatch || catMatch || q === '*') {
        matches.push(p);
      }
    }

    const limit = input.limit || 10;
    const sliced = matches.slice(0, limit).map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      currency: p.currency,
      inStock: p.stock > 0,
      category: p.category,
      description: p.description,
    }));

    return {
      products: sliced,
      totalCount: matches.length,
      query: input.query,
    };
  }

  // 2. get_product
  async getProduct(input: GetProductInput, _context: AiToolContext): Promise<GetProductOutput> {
    this.checkSimulatedError('get_product');
    const key = input.productId.trim();
    const p = this.products.get(key);

    if (!p) {
      throw new Error(`Product not found: ${input.productId}`);
    }

    return {
      product: {
        id: p.id,
        name: p.name,
        slug: p.slug,
        description: p.description,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        currency: p.currency,
        stock: p.stock,
        inStock: p.stock > 0,
        status: p.status,
        variants: p.variants.map((v) => ({
          id: v.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          inStock: v.stock > 0,
        })),
        images: p.images,
      },
    };
  }

  // 3. get_variant_stock
  async getVariantStock(input: GetVariantStockInput, _context: AiToolContext): Promise<GetVariantStockOutput> {
    this.checkSimulatedError('get_variant_stock');
    const p = this.products.get(input.productId.trim());
    if (!p) {
      throw new Error(`Product not found: ${input.productId}`);
    }

    let targetStock = p.stock;
    let matchedVariantName: string | undefined = undefined;
    let matchedSku: string | undefined = undefined;

    if (input.variantName || input.sku) {
      const v = p.variants.find(
        (item) =>
          (input.variantName && item.name.toLowerCase() === input.variantName.toLowerCase()) ||
          (input.sku && item.sku?.toLowerCase() === input.sku.toLowerCase())
      );
      if (v) {
        targetStock = v.stock;
        matchedVariantName = v.name;
        matchedSku = v.sku || undefined;
      } else {
        throw new Error(`Variant '${input.variantName || input.sku}' not found on product ${p.name}`);
      }
    }

    let stockLevel: 'out_of_stock' | 'low_stock' | 'in_stock' = 'in_stock';
    let message = `Producto disponible (${targetStock} piezas disponibles).`;

    if (targetStock <= 0) {
      stockLevel = 'out_of_stock';
      message = 'Actualmente agotado. Puedes solicitar notificación de reabastecimiento.';
    } else if (targetStock <= 5) {
      stockLevel = 'low_stock';
      message = `¡Últimas piezas disponibles! Solo quedan ${targetStock} unidades en almacén.`;
    }

    return {
      productId: p.id,
      variantName: matchedVariantName,
      sku: matchedSku,
      inStock: targetStock > 0,
      stockLevel,
      availableQuantity: targetStock,
      message,
    };
  }

  // 4. get_price
  async getPrice(input: GetPriceInput, _context: AiToolContext): Promise<GetPriceOutput> {
    this.checkSimulatedError('get_price');
    const p = this.products.get(input.productId.trim());
    if (!p) {
      throw new Error(`Product not found: ${input.productId}`);
    }

    let unitPrice = p.price;
    if (input.variantName) {
      const v = p.variants.find((item) => item.name.toLowerCase() === input.variantName!.toLowerCase());
      if (v && v.price !== null && v.price !== undefined) {
        unitPrice = v.price;
      }
      if (!v) throw new Error('Variant not found');
    }

    const quantity = input.quantity || 1;
    const subtotal = unitPrice * quantity;
    let discountAmount = 0;
    let couponApplied = false;
    let couponNote: string | undefined = undefined;

    if (input.couponCode) {
      const code = input.couponCode.trim().toUpperCase();
      if (code === 'BIENVENIDA10') {
        discountAmount = Math.round(subtotal * 0.1);
        couponApplied = true;
        couponNote = 'Cupón BIENVENIDA10 aplicado: 10% de descuento.';
      } else if (code === 'SINNER15') {
        discountAmount = Math.round(subtotal * 0.15);
        couponApplied = true;
        couponNote = 'Cupón SINNER15 aplicado: 15% de descuento en tu orden.';
      } else {
        couponNote = `El cupón '${input.couponCode}' no es válido o ha expirado.`;
      }
    }

    const finalTotal = Math.max(0, subtotal - discountAmount);

    return {
      productId: p.id,
      unitPrice,
      quantity,
      subtotal,
      discountAmount,
      finalTotal,
      currency: p.currency,
      couponApplied,
      couponNote,
    };
  }

  // 5. get_delivery_options
  async getDeliveryOptions(input: GetDeliveryOptionsInput, _context: AiToolContext): Promise<GetDeliveryOptionsOutput> {
    this.checkSimulatedError('get_delivery_options');
    return {
      destination: {
        postalCode: input.postalCode,
        city: input.city,
        country: input.country || 'MX',
      },
      options: [
        {
          id: 'ship-standard',
          name: 'Envío Estándar Nacional',
          estimatedDays: '3 a 5 días hábiles',
          cost: 99,
          currency: 'MXN',
          freeThreshold: 999,
        },
        {
          id: 'ship-express',
          name: 'Envío Exprés Prioritario',
          estimatedDays: '1 a 2 días hábiles',
          cost: 180,
          currency: 'MXN',
        },
      ],
    };
  }

  // 6. get_payment_options
  async getPaymentOptions(input: GetPaymentOptionsInput, _context: AiToolContext): Promise<GetPaymentOptionsOutput> {
    this.checkSimulatedError('get_payment_options');
    return {
      currency: input.currency || 'MXN',
      methods: [
        {
          method: 'card',
          name: 'Tarjeta de Crédito / Débito (Visa, Mastercard, Amex)',
          description: 'Procesamiento encriptado seguro mediante Stripe con soporte 3D Secure.',
          supported: true,
          secureRedirectOnly: true,
        },
        {
          method: 'oxxo',
          name: 'Pago en Efectivo OXXO Pay',
          description: 'Genera ficha de pago con código de barras para liquidar en tiendas de conveniencia.',
          supported: true,
          secureRedirectOnly: true,
        },
        {
          method: 'spei',
          name: 'Transferencia Interbancaria SPEI',
          description: 'Pago instantáneo por transferencia electrónica CLABE única.',
          supported: true,
          secureRedirectOnly: true,
        },
      ],
      paymentCaptureSupportedByAi: false,
      securityNotice:
        'Por estricta política de seguridad PCI DSS, el agente de IA nunca captura ni solicita números de tarjeta o CVV. Todos los pagos se completan exclusivamente en la pasarela encriptada oficial de Selfcare Sinners.',
    };
  }

  // 7. create_cart
  async createCart(input: CreateCartInput, _context: AiToolContext): Promise<CreateCartOutput> {
    const owner = this.owner(_context);
    this.checkSimulatedError('create_cart');
    const cartId = `cart_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let subtotal = 0;
    const resolvedItems = [];

    for (const item of input.items) {
      const p = this.products.get(item.productId.trim());
      if (!p) throw new Error(`Product not found: ${item.productId}`);
      let unitPrice = p.price;
      if (item.variantName) {
        const v = p.variants.find((varItem) => varItem.name.toLowerCase() === item.variantName!.toLowerCase());
        if (!v) throw new Error('Variant not found');
        unitPrice = v.price ?? p.price;
      }
      subtotal += unitPrice * item.quantity;
      resolvedItems.push({
        productId: p.id,
        name: p.name,
        quantity: item.quantity,
        variantName: item.variantName,
        unitPrice,
      });
    }

    const now = new Date().toISOString();
    this.carts.set(cartId, {
      id: cartId,
      customerEmail: input.customerEmail,
      items: resolvedItems,
      createdAt: now,
      updatedAt: now,
    });
    this.cartOwners.set(cartId, owner);

    return {
      cartId,
      itemsCount: resolvedItems.reduce((acc, i) => acc + i.quantity, 0),
      subtotal,
      currency: 'MXN',
      createdAt: now,
    };
  }

  // 8. update_cart
  async updateCart(input: UpdateCartInput, _context: AiToolContext): Promise<UpdateCartOutput> {
    this.assertCartOwner(input.cartId, _context);
    this.checkSimulatedError('update_cart');
    const cart = this.carts.get(input.cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${input.cartId}`);
    }

    if (input.action === 'clear') {
      cart.items = [];
    } else if (input.action === 'add_item' && input.item) {
      const p = this.products.get(input.item.productId);
      if (!p) throw new Error('Product not found');
      const variant = input.item.variantName ? p.variants.find(v => v.name.toLowerCase() === input.item.variantName.toLowerCase()) : undefined;
      if (input.item.variantName && !variant) throw new Error('Variant not found');
      const existing = cart.items.find((i) => i.productId === input.item!.productId && i.variantName === input.item!.variantName);
      if (existing) {
        existing.quantity += input.item.quantity;
      } else {
        const p = this.products.get(input.item.productId);
        if (!p) throw new Error('Product not found');
        const unitPrice = variant?.price ?? p.price;
        cart.items.push({
          productId: input.item.productId,
          variantName: input.item.variantName,
          quantity: input.item.quantity,
          name: p?.name,
          unitPrice,
        });
      }
    } else if (input.action === 'remove_item' && input.item) {
      const matches = (i: any) => i.productId === input.item!.productId && i.variantName === input.item!.variantName;
      if (!cart.items.some(matches)) throw new Error('Cart item not found');
      cart.items = cart.items.filter(i => !matches(i));
    } else if (input.action === 'update_quantity' && input.item) {
      const existing = cart.items.find((i) => i.productId === input.item!.productId && i.variantName === input.item!.variantName);
      if (!existing) throw new Error('Cart item not found');
      if (existing) {
        if (input.item.quantity <= 0) {
          cart.items = cart.items.filter((i) => i.productId !== input.item!.productId);
        } else {
          existing.quantity = input.item.quantity;
        }
      }
    }

    cart.updatedAt = new Date().toISOString();
    const subtotal = cart.items.reduce((acc, i) => acc + (i.unitPrice || 0) * (i.quantity || 1), 0);

    return {
      cartId: cart.id,
      items: cart.items,
      itemsCount: cart.items.reduce((acc, i) => acc + (i.quantity || 0), 0),
      subtotal,
      currency: 'MXN',
      updatedAt: cart.updatedAt,
    };
  }

  // 9. create_order_draft (Strictly unpaid draft, NO payment capture)
  async createOrderDraft(input: CreateOrderDraftInput, _context: AiToolContext): Promise<CreateOrderDraftOutput> {
    this.owner(_context);
    if (!_context.customerEmail || input.customerEmail.toLowerCase() !== _context.customerEmail.toLowerCase()) throw new Error('FORBIDDEN');
    this.checkSimulatedError('create_order_draft');
    const draftOrderId = `draft_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let subtotal = 0;

    if (input.cartId) {
      this.assertCartOwner(input.cartId, _context);
      const cart = this.carts.get(input.cartId);
      if (!cart || !cart.items.length) throw new Error('Cart not found or empty');
      if (cart) {
        subtotal = cart.items.reduce((acc, i) => acc + (i.unitPrice || 0) * (i.quantity || 1), 0);
      }
    } else if (input.items && input.items.length > 0) {
      for (const item of input.items) {
        const p = this.products.get(item.productId.trim());
        if (!p) throw new Error('Product not found');
        const variant = item.variantName ? p.variants.find(v => v.name.toLowerCase() === item.variantName.toLowerCase()) : undefined;
        if (item.variantName && !variant) throw new Error('Variant not found');
        const price = variant?.price ?? p.price;
        subtotal += price * item.quantity;
      }
    } else {
      throw new Error('Either cartId or items array is required to create an order draft');
    }

    let discountAmount = 0;
    if (input.couponCode?.toUpperCase() === 'BIENVENIDA10') {
      discountAmount = Math.round(subtotal * 0.1);
    }

    const shippingCost = subtotal >= 999 ? 0 : 99;
    const total = Math.max(0, subtotal - discountAmount + shippingCost);
    const checkoutUrl = `https://selfcaresinners.com/checkout?draft_id=${draftOrderId}`;
    const now = new Date().toISOString();

    const draftRecord = {
      draftOrderId,
      status: 'draft' as const,
      customerEmail: input.customerEmail,
      subtotal,
      discountAmount,
      shippingCost,
      total,
      currency: 'MXN',
      checkoutUrl,
      paymentStatus: 'unpaid' as const,
      requiresCustomerPaymentConfirmation: true as const,
      createdAt: now,
    };
    this.drafts.set(draftOrderId, draftRecord);

    return draftRecord;
  }

  // 10. get_order_status (Enforces email verification for privacy)
  async getOrderStatus(input: GetOrderStatusInput, _context: AiToolContext): Promise<GetOrderStatusOutput> {
    this.owner(_context);
    this.checkSimulatedError('get_order_status');
    const order = this.orders.get(input.orderId.trim());
    if (!order || order.storeId !== _context.storeId || order.userId !== _context.userId ||
        input.customerEmail.toLowerCase() !== _context.customerEmail?.toLowerCase()) {
      throw new Error(`Order not found: ${input.orderId}`);
    }

    // Verify email matches to prevent unauthorized enumeration
    const reqEmail = input.customerEmail.trim().toLowerCase();
    const storedEmail = order.customerEmail.trim().toLowerCase();
    if (reqEmail !== storedEmail) {
      throw new Error(`Order not found or customer verification mismatch for order ${input.orderId}`);
    }

    return {
      orderId: order.id,
      status: order.status,
      createdAt: order.createdAt,
      total: order.total,
      currency: order.currency,
      carrier: order.carrier || null,
      trackingNumber: order.trackingNumber || null,
      trackingUrl: order.trackingUrl || null,
      items: order.items,
      timeline: order.timeline,
    };
  }

  // 11. request_human_handoff
  async requestHumanHandoff(input: RequestHumanHandoffInput, _context: AiToolContext): Promise<RequestHumanHandoffOutput> {
    this.owner(_context);
    if (input.orderId) await this.getOrderStatus({ orderId: input.orderId, customerEmail: _context.customerEmail ?? '' }, _context);
    this.checkSimulatedError('request_human_handoff');
    const ticketId = `ticket_care_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const waitTimes: Record<string, number> = {
      urgent: 2,
      high: 5,
      medium: 12,
      low: 30,
    };
    const estimatedWaitMinutes = waitTimes[input.priority] || 15;

    const ticket = {
      ticketId,
      status: 'queued' as const,
      priority: input.priority,
      reason: input.reason,
      summary: input.summary,
      customerEmail: input.customerEmail,
      orderId: input.orderId,
      estimatedWaitMinutes,
      handoffTimestamp: now,
      confirmationMessage:
        'Tu solicitud de atención humana ha sido registrada exitosamente. Un especialista de soporte se unirá a la conversación en breve.',
    };

    this.handoffTickets.set(ticketId, ticket);

    return ticket;
  }
}
