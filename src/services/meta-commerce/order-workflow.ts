import crypto from 'node:crypto';
import type { Product, ProductVariant } from '../../types';
import type { ConversationState, ConversationShippingLocation } from '../../types/meta-commerce';
import type { CatalogRepository } from './catalog-repository';
import { formatCurrencyMxn } from './catalog-resolver';
import type { ConversationService } from './conversation-service';
import type { OrderDraftRepository } from './order-repository';
import {
  type BackendOrderContract,
  type BackendOrderItemPayload,
  type BackendOrderPayload,
  type CustomerInfo,
  type DeliveryMethod,
  type OrderDraft,
  type OrderDraftItem,
  type OrderLifecycleStatus,
  type OrderWorkflowResult,
  type OrderWorkflowStep,
  type PaymentChoice,
  CustomerInfoSchema,
  DEFAULT_SHIPPING_FEE_MXN,
  FREE_SHIPPING_THRESHOLD_MXN,
  ISO_CURRENCY_MXN,
  OrderDraftSchema,
  ORDER_WORKFLOW_STEPS,
} from './order-types';
import type { StoreFulfillmentCapabilities } from './fulfillment-types';

export class OrderWorkflowError extends Error {
  constructor(
    message: string,
    public readonly step: OrderWorkflowStep,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'OrderWorkflowError';
  }
}

export interface WorkflowOptions {
  messageId?: string;
  idempotencyKey?: string;
  storeId?: string;
  channel?: string;
}

/**
 * Calculates financial totals for an order draft.
 * STRICT INVARIANT: Total prices derive exclusively from authoritative unit prices and shipping rules.
 */
export function calculateDraftTotals(
  items: OrderDraftItem[],
  deliveryMethod: DeliveryMethod | null | undefined,
  discountAmount: number = 0,
): { subtotal: number; shippingFee: number; discountAmount: number; total: number } {
  const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);

  let shippingFee = 0;
  if (deliveryMethod === 'shipping') {
    shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD_MXN ? 0 : DEFAULT_SHIPPING_FEE_MXN;
  } else {
    shippingFee = 0; // pickup or unselected is 0
  }

  const safeDiscount = Math.max(0, discountAmount);
  const total = Math.max(0, subtotal + shippingFee - safeDiscount);

  return {
    subtotal,
    shippingFee,
    discountAmount: safeDiscount,
    total,
  };
}

/**
 * Determines the current required workflow step based on draft completeness.
 * STRICT SEQUENCE:
 * product → variant → quantity → delivery → customer data → payment choice → confirmation → order draft
 */
export function determineCurrentStep(draft: OrderDraft): OrderWorkflowStep {
  if (draft.status === 'confirmed') {
    return 'order_draft';
  }

  if (!draft.items || draft.items.length === 0) {
    return 'product';
  }

  const primaryItem = draft.items[0];
  if (primaryItem.requiresVariant && !primaryItem.variantId) {
    return 'variant';
  }

  if (!primaryItem.quantity || primaryItem.quantity < 1) {
    return 'quantity';
  }

  if (!draft.deliveryMethod) {
    return 'delivery';
  }

  if (
    !draft.customer ||
    !draft.customer.name ||
    !draft.customer.email ||
    (draft.deliveryMethod === 'shipping' && !draft.shippingAddress)
  ) {
    return 'customer_data';
  }

  if (!draft.paymentMethod) {
    return 'payment_choice';
  }

  if (!draft.customerConfirmed) {
    return 'confirmation';
  }

  return 'order_draft';
}

/**
 * Core order workflow orchestrator managing the 8-step sequence:
 * product → variant → quantity → delivery → customer data → payment choice → confirmation → order draft
 */
export class OrderWorkflowService {
  constructor(
    private readonly orderRepository: OrderDraftRepository,
    private readonly catalogRepository: CatalogRepository,
    private readonly conversationService?: ConversationService,
    private readonly capabilities?: StoreFulfillmentCapabilities,
  ) {}

  /**
   * Retrieves active draft for conversation or initializes a new one.
   */
  async getOrCreateDraft(
    conversationId: string,
    externalUserId: string,
    channel: string = 'instagram',
    storeId: string = 'store_black_relic_main',
  ): Promise<OrderDraft> {
    const existing = await this.orderRepository.findActiveDraftByConversationId(conversationId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newDraft: OrderDraft = {
      id: `draft_${crypto.randomUUID()}`,
      conversationId,
      externalUserId,
      channel,
      storeId,
      step: 'product',
      status: 'cart',
      items: [],
      deliveryMethod: null,
      shippingAddress: null,
      customer: null,
      paymentMethod: null,
      subtotal: 0,
      shippingFee: 0,
      discountAmount: 0,
      couponCode: null,
      total: 0,
      currency: ISO_CURRENCY_MXN,
      customerConfirmed: false,
      confirmedAt: null,
      backendOrderId: null,
      lastMessageId: null,
      idempotencyKey: null,
      createdAt: now,
      updatedAt: now,
      metadata: {},
    };

    return this.orderRepository.saveDraft(newDraft);
  }

  /**
   * STEP 1: Select product from catalog.
   */
  async selectProduct(
    conversationId: string,
    productId: string,
    options?: WorkflowOptions,
  ): Promise<OrderWorkflowResult> {
    const draft = await this.ensureDraft(conversationId, options);

    const product = await this.catalogRepository.findById(productId);
    if (!product || product.status === 'archived') {
      return {
        success: false,
        step: 'product',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'product',
        isDuplicate: false,
        error: `Producto no encontrado o no disponible: ${productId}`,
        prompt: 'No pudimos encontrar el producto solicitado en nuestro catálogo. ¿Te gustaría ver nuestros artículos disponibles?',
      };
    }

    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    const initialQty = 1;
    const unitPrice = product.price;

    const productSku = typeof (product as any).sku === 'string' ? (product as any).sku : null;

    const newItem: OrderDraftItem = {
      productId: product.id,
      variantId: null,
      name: product.name,
      variantName: null,
      sku: productSku,
      quantity: initialQty,
      unitPrice,
      totalPrice: unitPrice * initialQty,
      images: Array.isArray(product.images) ? [...product.images] : [],
      productSnapshot: {
        id: product.id,
        name: product.name,
        baseName: product.name,
        variantName: null,
        price: unitPrice,
        sku: productSku,
        images: Array.isArray(product.images) ? [...product.images] : [],
      },
      requiresVariant: hasVariants,
    };

    draft.items = [newItem];
    draft.status = 'cart';
    draft.step = hasVariants ? 'variant' : 'quantity';
    draft.lastMessageId = options?.messageId || draft.lastMessageId;

    const totals = calculateDraftTotals(draft.items, draft.deliveryMethod, draft.discountAmount);
    draft.subtotal = totals.subtotal;
    draft.shippingFee = totals.shippingFee;
    draft.total = totals.total;
    draft.updatedAt = new Date().toISOString();

    const savedDraft = await this.orderRepository.saveDraft(draft);

    if (this.conversationService) {
      try {
        await this.conversationService.applyEvent(conversationId, {
          type: 'PRODUCT_SELECTED',
          productId: product.id,
          quantity: initialQty,
        });
      } catch {
        // Safe continuation if conversation state is managed externally
      }
    }

    let prompt: string;
    if (hasVariants) {
      const availableVariants = (product.variants || []).filter((v) => v.stock > 0);
      const variantList = availableVariants.map((v) => v.name).join(', ');
      prompt = `Has seleccionado ${product.name} (${formatCurrencyMxn(product.price)}). ¿Qué talla o variante te gustaría? Opciones con stock: ${variantList || 'consultar disponibilidad'}.`;
    } else {
      prompt = `Has seleccionado ${product.name} (${formatCurrencyMxn(product.price)}). ¿Cuántas piezas te gustaría ordenar?`;
    }

    return {
      success: true,
      step: savedDraft.step,
      status: savedDraft.status,
      draft: savedDraft,
      backendOrder: null,
      missingStep: null,
      isDuplicate: false,
      prompt,
    };
  }

  /**
   * STEP 2: Select variant (size, color) for current product.
   */
  async selectVariant(
    conversationId: string,
    variantId: string,
    options?: WorkflowOptions,
  ): Promise<OrderWorkflowResult> {
    const draft = await this.ensureDraft(conversationId, options);

    if (!draft.items || draft.items.length === 0) {
      return {
        success: false,
        step: 'product',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'product',
        isDuplicate: false,
        error: 'Debes seleccionar un producto primero',
        prompt: 'Por favor selecciona primero una prenda o artículo de nuestro catálogo.',
      };
    }

    const currentItem = draft.items[0];
    const product = await this.catalogRepository.findById(currentItem.productId);
    if (!product) {
      return {
        success: false,
        step: 'product',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'product',
        isDuplicate: false,
        error: `Producto no encontrado: ${currentItem.productId}`,
        prompt: 'No pudimos verificar el producto seleccionado.',
      };
    }

    const variants = product.variants || [];
    const variant = variants.find(
      (v) =>
        v.id === variantId ||
        v.sku === variantId ||
        v.name.toLowerCase() === variantId.toLowerCase(),
    );

    if (!variant) {
      const availableList = variants.filter((v) => v.stock > 0).map((v) => v.name).join(', ');
      return {
        success: false,
        step: 'variant',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'variant',
        isDuplicate: false,
        error: `Variante no encontrada: ${variantId}`,
        prompt: `No encontramos esa talla/variante para ${product.name}. Disponibles en stock: ${availableList}.`,
      };
    }

    if (variant.stock <= 0) {
      const inStockOtherSizes = variants.filter((v) => v.stock > 0).map((v) => v.name).join(', ');
      return {
        success: false,
        step: 'variant',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'variant',
        isDuplicate: false,
        error: `La variante ${variant.name} está agotada`,
        prompt: `La talla ${variant.name} está agotada en este momento. Tenemos disponible en: ${inStockOtherSizes || 'ninguna por el momento'}.`,
      };
    }

    const variantPrice = typeof variant.price === 'number' ? variant.price : product.price;

    currentItem.variantId = variant.id;
    currentItem.variantName = variant.name;
    currentItem.sku = variant.sku || currentItem.sku;
    currentItem.unitPrice = variantPrice;
    currentItem.totalPrice = variantPrice * currentItem.quantity;
    currentItem.productSnapshot.variantName = variant.name;
    currentItem.productSnapshot.price = variantPrice;
    currentItem.productSnapshot.sku = variant.sku || currentItem.sku;

    draft.status = 'cart';
    draft.step = 'quantity';
    draft.lastMessageId = options?.messageId || draft.lastMessageId;

    const totals = calculateDraftTotals(draft.items, draft.deliveryMethod, draft.discountAmount);
    draft.subtotal = totals.subtotal;
    draft.shippingFee = totals.shippingFee;
    draft.total = totals.total;
    draft.updatedAt = new Date().toISOString();

    const savedDraft = await this.orderRepository.saveDraft(draft);

    if (this.conversationService) {
      try {
        await this.conversationService.applyEvent(conversationId, {
          type: 'VARIANT_SELECTED',
          variantId: variant.id,
        });
      } catch {
        // Safe continuation
      }
    }

    return {
      success: true,
      step: savedDraft.step,
      status: savedDraft.status,
      draft: savedDraft,
      backendOrder: null,
      missingStep: null,
      isDuplicate: false,
      prompt: `Excelente, talla/variante ${variant.name} agregada. ¿Cuántas piezas te gustaría ordenar? (Actualmente 1 pieza).`,
    };
  }

  /**
   * STEP 3: Set quantity with authoritative stock verification.
   */
  async setQuantity(
    conversationId: string,
    quantity: number,
    options?: WorkflowOptions,
  ): Promise<OrderWorkflowResult> {
    const draft = await this.ensureDraft(conversationId, options);

    if (!Number.isInteger(quantity) || quantity < 1) {
      return {
        success: false,
        step: 'quantity',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'quantity',
        isDuplicate: false,
        error: 'La cantidad debe ser un entero positivo mayor o igual a 1',
        prompt: 'Por favor indica una cantidad válida de piezas (por ejemplo 1 o 2).',
      };
    }

    if (!draft.items || draft.items.length === 0) {
      return {
        success: false,
        step: 'product',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'product',
        isDuplicate: false,
        error: 'No hay producto en el carrito',
        prompt: 'Por favor selecciona primero un producto.',
      };
    }

    const currentItem = draft.items[0];
    const product = await this.catalogRepository.findById(currentItem.productId);
    if (!product) {
      return {
        success: false,
        step: 'product',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'product',
        isDuplicate: false,
        error: 'Producto no encontrado',
        prompt: 'No pudimos verificar el producto.',
      };
    }

    // Verify stock authoritatively
    let availableStock = product.stock;
    if (currentItem.variantId && Array.isArray(product.variants)) {
      const v = product.variants.find((varItem) => varItem.id === currentItem.variantId);
      if (v) availableStock = v.stock;
    }

    if (availableStock < quantity) {
      return {
        success: false,
        step: 'quantity',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'quantity',
        isDuplicate: false,
        error: `Inventario insuficiente: solicitado ${quantity}, disponible ${availableStock}`,
        prompt: `Solo contamos con ${availableStock} pieza(s) disponible(s) en este momento. ¿Te gustaría ajustar tu pedido a esa cantidad?`,
      };
    }

    currentItem.quantity = quantity;
    currentItem.totalPrice = currentItem.unitPrice * quantity;

    draft.status = 'cart';
    draft.step = 'delivery';
    draft.lastMessageId = options?.messageId || draft.lastMessageId;

    const totals = calculateDraftTotals(draft.items, draft.deliveryMethod, draft.discountAmount);
    draft.subtotal = totals.subtotal;
    draft.shippingFee = totals.shippingFee;
    draft.total = totals.total;
    draft.updatedAt = new Date().toISOString();

    const savedDraft = await this.orderRepository.saveDraft(draft);

    if (this.conversationService) {
      try {
        await this.conversationService.applyEvent(conversationId, {
          type: 'QUANTITY_SET',
          quantity,
        });
        await this.conversationService.applyEvent(conversationId, {
          type: 'CART_ASSOCIATED',
          cartId: savedDraft.id,
        });
      } catch {
        // Safe continuation
      }
    }

    return {
      success: true,
      step: savedDraft.step,
      status: savedDraft.status,
      draft: savedDraft,
      backendOrder: null,
      missingStep: null,
      isDuplicate: false,
      prompt: `Guardamos ${quantity} pieza(s) en tu carrito (Subtotal: ${formatCurrencyMxn(savedDraft.subtotal)}). ¿Prefieres envío a domicilio o recolección en tienda?`,
    };
  }

  /**
   * STEP 4: Select delivery method (shipping vs pickup).
   */
  async selectDelivery(
    conversationId: string,
    deliveryMethod: DeliveryMethod,
    shippingLocation?: ConversationShippingLocation | null,
    options?: WorkflowOptions,
  ): Promise<OrderWorkflowResult> {
    const draft = await this.ensureDraft(conversationId, options);

    if (deliveryMethod !== 'shipping' && deliveryMethod !== 'pickup') {
      return {
        success: false,
        step: 'delivery',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'delivery',
        isDuplicate: false,
        error: `Método de entrega no soportado: ${deliveryMethod}`,
        prompt: 'Contamos con dos modalidades de entrega: 1) Envío a domicilio, o 2) Recolección en tienda. ¿Cuál prefieres?',
      };
    }

    if (this.capabilities) {
      if (deliveryMethod === 'shipping' && !this.capabilities.delivery.shipping.enabled) {
        return {
          success: false,
          step: 'delivery',
          status: draft.status,
          draft,
          backendOrder: null,
          missingStep: 'delivery',
          isDuplicate: false,
          error: 'Los envíos a domicilio no están habilitados actualmente en la tienda',
          prompt: 'Los envíos a domicilio no están disponibles en este momento. Ofrecemos recolección en tienda.',
        };
      }
      if (deliveryMethod === 'pickup' && !this.capabilities.delivery.pickup.enabled) {
        return {
          success: false,
          step: 'delivery',
          status: draft.status,
          draft,
          backendOrder: null,
          missingStep: 'delivery',
          isDuplicate: false,
          error: 'La recolección en tienda no está habilitada actualmente en la tienda',
          prompt: 'La recolección en tienda no está disponible en este momento. Ofrecemos envío a domicilio.',
        };
      }
    }

    draft.deliveryMethod = deliveryMethod;
    if (shippingLocation) {
      draft.shippingAddress = shippingLocation;
    }

    draft.status = 'cart';
    draft.step = 'customer_data';
    draft.lastMessageId = options?.messageId || draft.lastMessageId;

    const totals = calculateDraftTotals(draft.items, draft.deliveryMethod, draft.discountAmount);
    draft.subtotal = totals.subtotal;
    draft.shippingFee = totals.shippingFee;
    draft.total = totals.total;
    draft.updatedAt = new Date().toISOString();

    const savedDraft = await this.orderRepository.saveDraft(draft);

    if (this.conversationService) {
      try {
        await this.conversationService.applyEvent(conversationId, {
          type: 'DELIVERY_METHOD_SELECTED',
          deliveryMethod,
        });
        if (shippingLocation) {
          await this.conversationService.applyEvent(conversationId, {
            type: 'SHIPPING_LOCATION_UPDATED',
            shippingLocation,
          });
        }
      } catch {
        // Safe continuation
      }
    }

    const shippingInfo =
      deliveryMethod === 'shipping'
        ? `Costo de envío: ${savedDraft.shippingFee === 0 ? '¡GRATIS!' : formatCurrencyMxn(savedDraft.shippingFee)}.`
        : 'Recolección en showroom sin costo.';

    const prompt = `Entrega seleccionada: ${deliveryMethod === 'shipping' ? 'Envío a domicilio' : 'Recolección en showroom'}. ${shippingInfo} Para continuar, ¿nos compartes tu nombre completo y correo electrónico para tu confirmación?`;

    return {
      success: true,
      step: savedDraft.step,
      status: savedDraft.status,
      draft: savedDraft,
      backendOrder: null,
      missingStep: null,
      isDuplicate: false,
      prompt,
    };
  }

  /**
   * STEP 5: Set customer contact data and shipping address.
   */
  async setCustomerData(
    conversationId: string,
    customer: CustomerInfo,
    options?: WorkflowOptions,
  ): Promise<OrderWorkflowResult> {
    const draft = await this.ensureDraft(conversationId, options);

    const validation = CustomerInfoSchema.safeParse(customer);
    if (!validation.success) {
      const errorMsg = validation.error.issues.map((i) => i.message).join('; ');
      return {
        success: false,
        step: 'customer_data',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'customer_data',
        isDuplicate: false,
        error: errorMsg,
        prompt: `Por favor proporciona datos válidos: ${errorMsg}.`,
      };
    }

    const validatedCustomer = validation.data;
    if (draft.deliveryMethod === 'shipping') {
      const address = validatedCustomer.shippingAddress || draft.shippingAddress;
      if (!address || (!address.addressLine1 && !address.rawText)) {
        return {
          success: false,
          step: 'customer_data',
          status: draft.status,
          draft,
          backendOrder: null,
          missingStep: 'customer_data',
          isDuplicate: false,
          error: 'La dirección de entrega es obligatoria para envíos a domicilio',
          prompt: 'Para realizar tu envío a domicilio, por favor compártenos tu dirección completa (calle, número, colonia, ciudad y código postal).',
        };
      }
      draft.shippingAddress = address;
    } else {
      // Data minimization invariant: pickup never retains or collects physical shipping address
      draft.shippingAddress = null;
      validatedCustomer.shippingAddress = null;
    }

    draft.customer = validatedCustomer;
    draft.status = 'cart';
    draft.step = 'payment_choice';
    draft.lastMessageId = options?.messageId || draft.lastMessageId;
    draft.updatedAt = new Date().toISOString();

    const savedDraft = await this.orderRepository.saveDraft(draft);

    return {
      success: true,
      step: savedDraft.step,
      status: savedDraft.status,
      draft: savedDraft,
      backendOrder: null,
      missingStep: null,
      isDuplicate: false,
      prompt: `Gracias ${validatedCustomer.name}. ¿Cómo prefieres realizar tu pago? Opciones: 1) Tarjeta (link de pago seguro), 2) Transferencia SPEI, 3) Efectivo al recibir.`,
    };
  }

  /**
   * STEP 6: Select payment method.
   * STRICT INVARIANT: NO REAL PAYMENT CAPTURE IN DM.
   */
  async selectPayment(
    conversationId: string,
    paymentMethod: PaymentChoice,
    options?: WorkflowOptions,
  ): Promise<OrderWorkflowResult> {
    const draft = await this.ensureDraft(conversationId, options);

    if (!['stripe', 'transfer', 'cash'].includes(paymentMethod)) {
      return {
        success: false,
        step: 'payment_choice',
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: 'payment_choice',
        isDuplicate: false,
        error: `Método de pago no soportado: ${paymentMethod}`,
        prompt: 'Los métodos de pago disponibles son: Tarjeta (link seguro), Transferencia SPEI o Efectivo. ¿Cuál eliges?',
      };
    }

    if (this.capabilities) {
      if (paymentMethod === 'stripe' && !this.capabilities.payments.stripe.enabled) {
        return {
          success: false,
          step: 'payment_choice',
          status: draft.status,
          draft,
          backendOrder: null,
          missingStep: 'payment_choice',
          isDuplicate: false,
          error: 'El pago con tarjeta no está habilitado actualmente en la tienda',
          prompt: 'El pago con tarjeta no está disponible en este momento.',
        };
      }
      if (paymentMethod === 'transfer' && !this.capabilities.payments.transfer.enabled) {
        return {
          success: false,
          step: 'payment_choice',
          status: draft.status,
          draft,
          backendOrder: null,
          missingStep: 'payment_choice',
          isDuplicate: false,
          error: 'El pago por transferencia SPEI no está habilitado actualmente en la tienda',
          prompt: 'La transferencia bancaria no está habilitada en este momento.',
        };
      }
      if (paymentMethod === 'cash') {
        if (!this.capabilities.payments.cash.enabled) {
          return {
            success: false,
            step: 'payment_choice',
            status: draft.status,
            draft,
            backendOrder: null,
            missingStep: 'payment_choice',
            isDuplicate: false,
            error: 'El pago en efectivo no está habilitado actualmente en la tienda',
            prompt: 'El pago en efectivo no está disponible en este momento.',
          };
        }
        if (this.capabilities.payments.cash.allowedOnlyForPickup && draft.deliveryMethod === 'shipping') {
          return {
            success: false,
            step: 'payment_choice',
            status: draft.status,
            draft,
            backendOrder: null,
            missingStep: 'payment_choice',
            isDuplicate: false,
            error: 'El pago en efectivo solo está disponible para recolección en tienda',
            prompt: 'El pago en efectivo solo está disponible para recolección en tienda.',
          };
        }
      }
    }

    draft.paymentMethod = paymentMethod;
    // Advance to draft status: all pre-requisites are collected, pricing snapshot frozen!
    draft.status = 'draft';
    draft.step = 'confirmation';
    draft.lastMessageId = options?.messageId || draft.lastMessageId;

    const totals = calculateDraftTotals(draft.items, draft.deliveryMethod, draft.discountAmount);
    draft.subtotal = totals.subtotal;
    draft.shippingFee = totals.shippingFee;
    draft.total = totals.total;
    draft.updatedAt = new Date().toISOString();

    const savedDraft = await this.orderRepository.saveDraft(draft);

    if (this.conversationService) {
      try {
        await this.conversationService.applyEvent(conversationId, {
          type: 'PAYMENT_METHOD_SELECTED',
          paymentMethod,
        });
        await this.conversationService.applyEvent(conversationId, {
          type: 'ORDER_DRAFT_CREATED',
          orderDraftId: savedDraft.id,
        });
      } catch {
        // Safe continuation
      }
    }

    const summary = this.buildDraftSummary(savedDraft);
    const prompt = `Resumen de tu pedido:\n${summary}\n\n¿Confirmas tu pedido para generar tu borrador de orden? (Responde "Sí, confirmar" para proceder).`;

    return {
      success: true,
      step: savedDraft.step,
      status: savedDraft.status,
      draft: savedDraft,
      backendOrder: null,
      missingStep: null,
      isDuplicate: false,
      prompt,
    };
  }

  /**
   * STEP 7: Request confirmation / review summary.
   */
  async requestConfirmation(
    conversationId: string,
    options?: WorkflowOptions,
  ): Promise<OrderWorkflowResult> {
    const draft = await this.ensureDraft(conversationId, options);
    const nextStep = determineCurrentStep(draft);

    if (nextStep !== 'confirmation' && nextStep !== 'order_draft') {
      return {
        success: false,
        step: draft.step,
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: nextStep,
        isDuplicate: false,
        error: `Faltan pasos para confirmar: ${nextStep}`,
        prompt: `Aún necesitamos completar el paso: ${nextStep} antes de confirmar.`,
      };
    }

    const summary = this.buildDraftSummary(draft);
    const prompt = `Por favor revisa el detalle de tu pedido:\n${summary}\n\n¿Confirmas tu orden?`;

    draft.step = 'confirmation';
    draft.status = 'draft';
    const savedDraft = await this.orderRepository.saveDraft(draft);

    return {
      success: true,
      step: savedDraft.step,
      status: savedDraft.status,
      draft: savedDraft,
      backendOrder: null,
      missingStep: null,
      isDuplicate: false,
      prompt,
    };
  }

  /**
   * STEP 8: Confirm order & backend creation.
   * STRICT RULES:
   * 1. No real payment capture.
   * 2. No production order mutation in tests.
   * 3. No confirmed order until backend creation succeeds.
   * 4. Idempotent retries.
   * 5. Duplicate messages cannot create duplicate orders.
   * 6. Distinguish cart/draft/confirmed.
   * 7. Preserve existing order contracts.
   */
  async confirmOrder(
    conversationId: string,
    options?: WorkflowOptions,
  ): Promise<OrderWorkflowResult> {
    const idempotencyKey = options?.idempotencyKey || null;
    const messageId = options?.messageId || null;

    // 1. Idempotency Check via key
    if (idempotencyKey) {
      const existingIdem = await this.orderRepository.checkIdempotency(idempotencyKey);
      if (existingIdem) {
        const existingDraft = await this.orderRepository.findDraftById(existingIdem.draftId);
        const existingBackendOrder = existingIdem.backendOrderId
          ? await this.orderRepository.findBackendOrderById(existingIdem.backendOrderId)
          : null;

        if (existingDraft) {
          return {
            success: true,
            step: 'order_draft',
            status: existingDraft.status,
            draft: existingDraft,
            backendOrder: existingBackendOrder,
            missingStep: null,
            isDuplicate: true,
            prompt: this.buildConfirmationPrompt(existingDraft, existingBackendOrder),
          };
        }
      }
    }

    // 2. Duplicate Message ID Check
    if (messageId) {
      const duplicateDraft = await this.orderRepository.findDraftByMessageId(messageId);
      if (duplicateDraft && duplicateDraft.status === 'confirmed') {
        const backendOrder = duplicateDraft.backendOrderId
          ? await this.orderRepository.findBackendOrderById(duplicateDraft.backendOrderId)
          : null;

        return {
          success: true,
          step: 'order_draft',
          status: 'confirmed',
          draft: duplicateDraft,
          backendOrder,
          missingStep: null,
          isDuplicate: true,
          prompt: this.buildConfirmationPrompt(duplicateDraft, backendOrder),
        };
      }
    }

    const draft = await this.ensureDraft(conversationId, options);

    // 3. Already confirmed draft check
    if (draft.status === 'confirmed' && draft.backendOrderId) {
      const existingBackendOrder = await this.orderRepository.findBackendOrderById(
        draft.backendOrderId,
      );
      return {
        success: true,
        step: 'order_draft',
        status: 'confirmed',
        draft,
        backendOrder: existingBackendOrder,
        missingStep: null,
        isDuplicate: true,
        prompt: this.buildConfirmationPrompt(draft, existingBackendOrder),
      };
    }

    // 4. Verify readiness
    const nextStep = determineCurrentStep(draft);
    if (nextStep !== 'confirmation' && nextStep !== 'order_draft') {
      return {
        success: false,
        step: draft.step,
        status: draft.status,
        draft,
        backendOrder: null,
        missingStep: nextStep,
        isDuplicate: false,
        error: `No se puede confirmar la orden. Falta completar: ${nextStep}`,
        prompt: `Faltan detalles para confirmar tu orden (paso pendiente: ${nextStep}).`,
      };
    }

    // 5. Construct backend order payload strictly preserving server.ts contract
    const primaryItem = draft.items[0];
    const backendItems: BackendOrderItemPayload[] = draft.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      product_snapshot: {
        id: item.productSnapshot.id,
        name: item.productSnapshot.name,
        baseName: item.productSnapshot.baseName,
        variantName: item.productSnapshot.variantName || null,
        price: item.productSnapshot.price,
        sku: item.productSnapshot.sku || null,
        images: item.productSnapshot.images || [],
      },
    }));

    const backendPayload: BackendOrderPayload = {
      store_id: draft.storeId,
      customer_user_id: null,
      customer_email: draft.customer?.email || null,
      status: 'pendiente',
      subtotal: draft.subtotal,
      total: draft.total,
      currency: 'mxn',
      coupon_code: draft.couponCode || null,
      discount_amount: draft.discountAmount,
      delivery_method: draft.deliveryMethod || null,
      payment_method: draft.paymentMethod || null,
      shipping_address: draft.shippingAddress || null,
      metadata: {
        source: 'meta_commerce_messaging',
        channel: draft.channel,
        conversation_id: draft.conversationId,
        external_user_id: draft.externalUserId,
        order_draft_id: draft.id,
        idempotency_key: idempotencyKey,
        last_message_id: messageId,
        created_via: 'OrderWorkflowService',
      },
      order_items: backendItems,
    };

    // 6. STRICT INVARIANT: No confirmed order until backend creation succeeds
    let backendOrder: BackendOrderContract;
    try {
      backendOrder = await this.orderRepository.createBackendOrder(backendPayload);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      // Backend creation failed: draft MUST remain in draft status, customerConfirmed remains false
      draft.status = 'draft';
      draft.customerConfirmed = false;
      draft.updatedAt = new Date().toISOString();
      await this.orderRepository.saveDraft(draft);

      return {
        success: false,
        step: 'confirmation',
        status: 'draft',
        draft,
        backendOrder: null,
        missingStep: null,
        isDuplicate: false,
        error: `Fallo en creación de orden backend: ${errorMsg}`,
        prompt:
          'Hubo un inconveniente temporal al registrar tu orden en el sistema. Tu borrador de pedido se encuentra a salvo y no se realizó ningún cargo. Por favor intenta confirmar nuevamente en unos momentos.',
      };
    }

    // 7. Backend creation SUCCEEDED: transition to confirmed
    const now = new Date().toISOString();
    draft.status = 'confirmed';
    draft.step = 'order_draft';
    draft.customerConfirmed = true;
    draft.confirmedAt = now;
    draft.backendOrderId = backendOrder.id;
    draft.lastMessageId = messageId || draft.lastMessageId;
    draft.idempotencyKey = idempotencyKey || draft.idempotencyKey;
    draft.updatedAt = now;

    const savedDraft = await this.orderRepository.saveDraft(draft);

    if (idempotencyKey) {
      await this.orderRepository.recordIdempotency(idempotencyKey, {
        draftId: savedDraft.id,
        backendOrderId: backendOrder.id,
      });
    }

    if (this.conversationService) {
      try {
        await this.conversationService.applyEvent(conversationId, {
          type: 'ORDER_DRAFT_CREATED',
          orderDraftId: savedDraft.id,
        });
      } catch {
        // Safe continuation
      }
    }

    const prompt = this.buildConfirmationPrompt(savedDraft, backendOrder);

    return {
      success: true,
      step: 'order_draft',
      status: 'confirmed',
      draft: savedDraft,
      backendOrder,
      missingStep: null,
      isDuplicate: false,
      prompt,
    };
  }

  /**
   * Cancels active draft and resets workflow.
   */
  async cancelDraft(conversationId: string): Promise<OrderWorkflowResult> {
    const draft = await this.orderRepository.findActiveDraftByConversationId(conversationId);
    if (!draft) {
      return {
        success: true,
        step: 'product',
        status: 'cancelled',
        draft: {
          id: `draft_${crypto.randomUUID()}`,
          conversationId,
          externalUserId: '',
          channel: 'instagram',
          storeId: '',
          step: 'product',
          status: 'cancelled',
          items: [],
          subtotal: 0,
          shippingFee: 0,
          discountAmount: 0,
          total: 0,
          currency: ISO_CURRENCY_MXN,
          customerConfirmed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          metadata: {},
        },
        backendOrder: null,
        missingStep: null,
        isDuplicate: false,
        prompt: 'Tu carrito ha sido cancelado.',
      };
    }

    draft.status = 'cancelled';
    draft.updatedAt = new Date().toISOString();
    const saved = await this.orderRepository.saveDraft(draft);

    return {
      success: true,
      step: 'product',
      status: 'cancelled',
      draft: saved,
      backendOrder: null,
      missingStep: null,
      isDuplicate: false,
      prompt: 'Tu carrito y borrador de orden han sido cancelados. ¿Deseas explorar otros artículos?',
    };
  }

  /**
   * Helper to format order summary for customer review.
   */
  public buildDraftSummary(draft: OrderDraft): string {
    const itemLines = draft.items
      .map(
        (i) =>
          `• ${i.name}${i.variantName ? ` (${i.variantName})` : ''} x${i.quantity} — ${formatCurrencyMxn(i.totalPrice)}`,
      )
      .join('\n');

    const deliveryDesc =
      draft.deliveryMethod === 'shipping'
        ? `Envío a domicilio (${draft.shippingFee === 0 ? 'Gratis' : formatCurrencyMxn(draft.shippingFee)})`
        : 'Recolección en tienda (Gratis)';

    const customerDesc = draft.customer ? `${draft.customer.name} (${draft.customer.email})` : 'Pendiente';

    const paymentDesc =
      draft.paymentMethod === 'stripe'
        ? 'Tarjeta (Link seguro)'
        : draft.paymentMethod === 'transfer'
          ? 'Transferencia bancaria SPEI'
          : draft.paymentMethod === 'cash'
            ? 'Efectivo'
            : 'Pendiente';

    return [
      itemLines,
      `Subtotal: ${formatCurrencyMxn(draft.subtotal)}`,
      `Entrega: ${deliveryDesc}`,
      `Total a pagar: ${formatCurrencyMxn(draft.total)}`,
      `Cliente: ${customerDesc}`,
      `Método de pago: ${paymentDesc}`,
    ].join('\n');
  }

  /**
   * Builds the final receipt and next steps prompt in natural Mexican Spanish.
   * STRICT INVARIANT: NO REAL PAYMENT CAPTURE; provides clear non-destructive instructions.
   */
  private buildConfirmationPrompt(
    draft: OrderDraft,
    backendOrder: BackendOrderContract | null,
  ): string {
    const orderRef = backendOrder?.id || draft.backendOrderId || draft.id;
    const recipient = draft.customer?.name || 'Cliente';

    let paymentInstructions = '';
    if (draft.paymentMethod === 'stripe') {
      paymentInstructions = `💳 Para completar tu pago con tarjeta de crédito o débito, puedes acceder a tu link seguro: https://selfcaresinners.com/checkout/${orderRef}. Recuerda que tus prendas quedan reservadas y el pedido se procesará tan pronto se acredite tu pago.`;
    } else if (draft.paymentMethod === 'transfer') {
      paymentInstructions = `🏦 Para pagar por transferencia SPEI, realiza tu depósito a la CLABE: 646180123456789012 (STP / BLACK RELIC) indicando tu folio "${orderRef}" en concepto. Tu pedido se preparará una vez recibido el comprobante.`;
    } else if (draft.paymentMethod === 'cash') {
      paymentInstructions = `💵 Tu pago en efectivo quedará registrado al momento de la entrega o recolección. Te notificaremos cuando tu paquete esté listo.`;
    }

    const deliveryNote =
      draft.deliveryMethod === 'shipping'
        ? '📦 Envío preparado por BLACK RELIC. Compartiremos tu número de guía de paquetería tan pronto sea despachado.'
        : '📍 Te notificaremos cuando tu pedido esté empacado y listo para recolección en nuestro showroom.';

    return [
      `¡Muchas gracias, ${recipient}! Tu pedido ha sido confirmado con éxito.`,
      `Folio de Orden: #${orderRef}`,
      `Monto Total: ${formatCurrencyMxn(draft.total)}`,
      paymentInstructions,
      deliveryNote,
      'Cualquier duda o cambio, puedes escribirnos por aquí mismo.',
    ].join('\n\n');
  }

  private async ensureDraft(
    conversationId: string,
    options?: WorkflowOptions,
  ): Promise<OrderDraft> {
    const existing = await this.orderRepository.findActiveDraftByConversationId(conversationId);
    if (existing) {
      if (options?.messageId) {
        existing.lastMessageId = options.messageId;
      }
      return existing;
    }

    return this.getOrCreateDraft(
      conversationId,
      `ext_${conversationId}`,
      options?.channel || 'instagram',
      options?.storeId || 'store_black_relic_main',
    );
  }
}
