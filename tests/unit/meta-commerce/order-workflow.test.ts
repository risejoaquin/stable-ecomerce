// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import {
  BLACK_RELIC_MOCK_CATALOG,
  InMemoryCatalogRepository,
  InMemoryConversationRepository,
  ConversationService,
  InMemoryOrderDraftRepository,
  OrderWorkflowService,
  calculateDraftTotals,
  determineCurrentStep,
  DEFAULT_SHIPPING_FEE_MXN,
  FREE_SHIPPING_THRESHOLD_MXN,
  ISO_CURRENCY_MXN,
  ORDER_WORKFLOW_STEPS,
  type CustomerInfo,
  type OrderDraft,
  type OrderDraftItem,
} from '../../../src/services/meta-commerce';

describe('Meta Commerce Order Workflow (AG-ORDER)', () => {
  let catalogRepo: InMemoryCatalogRepository;
  let orderRepo: InMemoryOrderDraftRepository;
  let convRepo: InMemoryConversationRepository;
  let convService: ConversationService;
  let workflow: OrderWorkflowService;

  const testConvId = 'conv_test_dm_001';
  const testUserId = 'user_ig_999';
  const hoodieProductId = 'prod_relic_hoodie_001'; // 1499 MXN
  const hoodieSizeSVariantId = 'var_hoodie_negro_s'; // Stock: 8
  const hoodieSizeMOOSVariantId = 'var_hoodie_negro_m'; // Stock: 0 (OOS)

  beforeEach(() => {
    catalogRepo = new InMemoryCatalogRepository(BLACK_RELIC_MOCK_CATALOG);
    orderRepo = new InMemoryOrderDraftRepository();
    convRepo = new InMemoryConversationRepository();
    convService = new ConversationService(convRepo);
    workflow = new OrderWorkflowService(orderRepo, catalogRepo, convService);
  });

  describe('1. Canonical Sequence Definition & Step Transitions', () => {
    it('defines the 8 exact canonical steps in the required order', () => {
      expect(ORDER_WORKFLOW_STEPS).toEqual([
        'product',
        'variant',
        'quantity',
        'delivery',
        'customer_data',
        'payment_choice',
        'confirmation',
        'order_draft',
      ]);
    });

    it('correctly determines current step from draft completeness', () => {
      const emptyDraft: OrderDraft = {
        id: 'draft_1',
        conversationId: testConvId,
        externalUserId: testUserId,
        channel: 'instagram',
        storeId: 'store_1',
        step: 'product',
        status: 'cart',
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
      };

      // Step 1: No items -> product
      expect(determineCurrentStep(emptyDraft)).toBe('product');

      // Step 2: Item requires variant -> variant
      emptyDraft.items = [
        {
          productId: hoodieProductId,
          variantId: null,
          name: 'Hoodie',
          variantName: null,
          sku: 'SKU-HOODIE',
          quantity: 1,
          unitPrice: 1499,
          totalPrice: 1499,
          images: [],
          requiresVariant: true,
          productSnapshot: {
            id: hoodieProductId,
            name: 'Hoodie',
            baseName: 'Hoodie',
            price: 1499,
            images: [],
          },
        },
      ];
      expect(determineCurrentStep(emptyDraft)).toBe('variant');

      // Step 3: Variant selected, quantity set -> delivery
      emptyDraft.items[0].variantId = hoodieSizeSVariantId;
      emptyDraft.items[0].variantName = 'Negro / S';
      expect(determineCurrentStep(emptyDraft)).toBe('delivery');

      // Step 4: Delivery selected -> customer_data
      emptyDraft.deliveryMethod = 'shipping';
      expect(determineCurrentStep(emptyDraft)).toBe('customer_data');

      // Step 5: Customer data provided with shipping address -> payment_choice
      emptyDraft.customer = {
        name: 'Alejandro Ramos',
        email: 'alejandro@example.com',
        phone: '+525512345678',
        shippingAddress: {
          addressLine1: 'Av Insurgentes Sur 1234',
          city: 'CDMX',
          postalCode: '03100',
        },
      };
      emptyDraft.shippingAddress = emptyDraft.customer.shippingAddress;
      expect(determineCurrentStep(emptyDraft)).toBe('payment_choice');

      // Step 6: Payment choice selected -> confirmation
      emptyDraft.paymentMethod = 'transfer';
      expect(determineCurrentStep(emptyDraft)).toBe('confirmation');

      // Step 7: Confirmed -> order_draft
      emptyDraft.customerConfirmed = true;
      emptyDraft.status = 'confirmed';
      expect(determineCurrentStep(emptyDraft)).toBe('order_draft');
    });
  });

  describe('2. Full 8-Step End-to-End Workflow Execution', () => {
    it('executes full sequence: product → variant → quantity → delivery → customer data → payment choice → confirmation → order draft', async () => {
      // Step 1: Select product
      const res1 = await workflow.selectProduct(testConvId, hoodieProductId);
      expect(res1.success).toBe(true);
      expect(res1.step).toBe('variant');
      expect(res1.status).toBe('cart');
      expect(res1.draft.items).toHaveLength(1);
      expect(res1.draft.subtotal).toBe(1499);
      expect(res1.prompt).toContain('Sudadera Relic Heavyweight 500 GSM');

      // Step 2: Select variant
      const res2 = await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      expect(res2.success).toBe(true);
      expect(res2.step).toBe('quantity');
      expect(res2.status).toBe('cart');
      expect(res2.draft.items[0].variantId).toBe(hoodieSizeSVariantId);
      expect(res2.prompt).toContain('Negro / S');

      // Step 3: Set quantity (2 pieces: 2 * 1499 = 2998 MXN)
      const res3 = await workflow.setQuantity(testConvId, 2);
      expect(res3.success).toBe(true);
      expect(res3.step).toBe('delivery');
      expect(res3.status).toBe('cart');
      expect(res3.draft.items[0].quantity).toBe(2);
      expect(res3.draft.subtotal).toBe(2998);

      // Step 4: Select delivery (shipping, subtotal 2998 >= 2000 -> free shipping!)
      const res4 = await workflow.selectDelivery(testConvId, 'shipping');
      expect(res4.success).toBe(true);
      expect(res4.step).toBe('customer_data');
      expect(res4.status).toBe('cart');
      expect(res4.draft.shippingFee).toBe(0); // Free shipping threshold met
      expect(res4.draft.total).toBe(2998);

      // Step 5: Set customer contact data
      const customerData: CustomerInfo = {
        name: 'Sofia Mendoza',
        email: 'sofia.mendoza@example.com',
        phone: '+525598765432',
        shippingAddress: {
          addressLine1: 'Colima 220, Roma Norte',
          city: 'Cuauhtémoc',
          state: 'CDMX',
          postalCode: '06700',
          country: 'MX',
        },
      };
      const res5 = await workflow.setCustomerData(testConvId, customerData);
      expect(res5.success).toBe(true);
      expect(res5.step).toBe('payment_choice');
      expect(res5.status).toBe('cart');
      expect(res5.draft.customer?.name).toBe('Sofia Mendoza');

      // Step 6: Select payment method (SPEI Transfer)
      const res6 = await workflow.selectPayment(testConvId, 'transfer');
      expect(res6.success).toBe(true);
      expect(res6.step).toBe('confirmation');
      expect(res6.status).toBe('draft'); // Transitions to draft status: all details collected!
      expect(res6.draft.paymentMethod).toBe('transfer');
      expect(res6.prompt).toContain('Resumen de tu pedido');

      // Step 7: Request confirmation preview
      const res7 = await workflow.requestConfirmation(testConvId);
      expect(res7.success).toBe(true);
      expect(res7.step).toBe('confirmation');
      expect(res7.status).toBe('draft');
      expect(res7.prompt).toContain('Sofia Mendoza');
      expect(res7.prompt).toContain('$2,998.00 MXN');

      // Step 8: Confirm order -> Backend creation
      const res8 = await workflow.confirmOrder(testConvId, {
        idempotencyKey: 'idem_flow_001',
        messageId: 'mid.$initial_confirm',
      });
      expect(res8.success).toBe(true);
      expect(res8.step).toBe('order_draft');
      expect(res8.status).toBe('confirmed'); // Transitions to confirmed!
      expect(res8.draft.customerConfirmed).toBe(true);
      expect(res8.draft.backendOrderId).toBeTruthy();
      expect(res8.backendOrder).not.toBeNull();
      expect(res8.backendOrder?.id).toBe(res8.draft.backendOrderId);
      expect(res8.backendOrder?.status).toBe('pendiente');
      expect(res8.prompt).toContain('¡Muchas gracias, Sofia Mendoza!');
      expect(res8.prompt).toContain('Folio de Orden: #');
      expect(res8.prompt).toContain('646180123456789012'); // SPEI CLABE
    });
  });

  describe('3. Financial & Shipping Calculations', () => {
    it('applies standard shipping fee for orders under free shipping threshold', () => {
      const items: OrderDraftItem[] = [
        {
          productId: 'prod_1',
          name: 'Playera',
          quantity: 1,
          unitPrice: 699,
          totalPrice: 699,
          images: [],
          requiresVariant: false,
          productSnapshot: { id: 'p1', name: 'Playera', baseName: 'Playera', price: 699, images: [] },
        },
      ];

      const totals = calculateDraftTotals(items, 'shipping');
      expect(totals.subtotal).toBe(699);
      expect(totals.shippingFee).toBe(DEFAULT_SHIPPING_FEE_MXN); // 150 MXN
      expect(totals.total).toBe(699 + 150); // 849 MXN
    });

    it('waives shipping fee for orders meeting free shipping threshold ($2,000 MXN)', () => {
      const items: OrderDraftItem[] = [
        {
          productId: 'prod_1',
          name: 'Sudadera',
          quantity: 2,
          unitPrice: 1499,
          totalPrice: 2998,
          images: [],
          requiresVariant: false,
          productSnapshot: { id: 'p1', name: 'Sudadera', baseName: 'Sudadera', price: 1499, images: [] },
        },
      ];

      const totals = calculateDraftTotals(items, 'shipping');
      expect(totals.subtotal).toBe(2998);
      expect(totals.shippingFee).toBe(0); // FREE
      expect(totals.total).toBe(2998);
    });

    it('charges 0 shipping fee for store pickup regardless of subtotal', () => {
      const items: OrderDraftItem[] = [
        {
          productId: 'prod_1',
          name: 'Accesorio',
          quantity: 1,
          unitPrice: 350,
          totalPrice: 350,
          images: [],
          requiresVariant: false,
          productSnapshot: { id: 'p1', name: 'Accesorio', baseName: 'Accesorio', price: 350, images: [] },
        },
      ];

      const totals = calculateDraftTotals(items, 'pickup');
      expect(totals.subtotal).toBe(350);
      expect(totals.shippingFee).toBe(0);
      expect(totals.total).toBe(350);
    });
  });

  describe('4. Lifecycle Distinction: cart vs draft vs confirmed', () => {
    it('strictly maintains distinct status values throughout the lifecycle', async () => {
      // 1. Initial / Product Selection -> cart
      const r1 = await workflow.selectProduct(testConvId, hoodieProductId);
      expect(r1.draft.status).toBe('cart');

      // 2. Variant -> cart
      const r2 = await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      expect(r2.draft.status).toBe('cart');

      // 3. Delivery -> cart
      const r3 = await workflow.selectDelivery(testConvId, 'pickup');
      expect(r3.draft.status).toBe('cart');

      // 4. Customer Data -> cart
      const r4 = await workflow.setCustomerData(testConvId, {
        name: 'Carlos Ruiz',
        email: 'carlos@example.com',
      });
      expect(r4.draft.status).toBe('cart');

      // 5. Payment Selection -> draft (pre-requisites satisfied, pricing snapshot frozen)
      const r5 = await workflow.selectPayment(testConvId, 'cash');
      expect(r5.draft.status).toBe('draft');
      expect(r5.draft.customerConfirmed).toBe(false);

      // 6. Confirmed -> confirmed
      const r6 = await workflow.confirmOrder(testConvId);
      expect(r6.draft.status).toBe('confirmed');
      expect(r6.draft.customerConfirmed).toBe(true);
      expect(r6.draft.backendOrderId).toBeTruthy();
    });

    it('cancelling sets status to cancelled', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      const cancelRes = await workflow.cancelDraft(testConvId);
      expect(cancelRes.status).toBe('cancelled');
      expect(cancelRes.draft.status).toBe('cancelled');
    });
  });

  describe('5. Rule: No Real Payment Capture in DM', () => {
    it('selects Stripe/card without collecting card numbers or triggering capture', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      await workflow.selectDelivery(testConvId, 'pickup');
      await workflow.setCustomerData(testConvId, { name: 'Lucia', email: 'lucia@example.com' });

      const res = await workflow.selectPayment(testConvId, 'stripe');
      expect(res.success).toBe(true);
      expect(res.draft.paymentMethod).toBe('stripe');

      const confirmed = await workflow.confirmOrder(testConvId);
      expect(confirmed.success).toBe(true);
      // Generates checkout URL link; never captures or asks for card digits in chat
      expect(confirmed.prompt).toContain('https://selfcaresinners.com/checkout/');
      expect(confirmed.backendOrder?.status).toBe('pendiente'); // Status remains pending payment!
    });
  });

  describe('6. Rule: No Production Order Mutation in Tests', () => {
    it('runs purely against in-memory repository without touching database', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      await workflow.selectDelivery(testConvId, 'pickup');
      await workflow.setCustomerData(testConvId, { name: 'Test User', email: 'test@example.com' });
      await workflow.selectPayment(testConvId, 'cash');
      const res = await workflow.confirmOrder(testConvId);

      expect(res.success).toBe(true);
      // Stored in in-memory repository
      const backendOrders = orderRepo.getAllBackendOrders();
      expect(backendOrders).toHaveLength(1);
      expect(backendOrders[0].id).toBe(res.draft.backendOrderId);
    });
  });

  describe('7. Rule: No Confirmed Order until Backend Creation Succeeds', () => {
    it('aborts transition to confirmed when backend order creation fails', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      await workflow.selectDelivery(testConvId, 'pickup');
      await workflow.setCustomerData(testConvId, { name: 'Failure Test', email: 'fail@example.com' });
      await workflow.selectPayment(testConvId, 'transfer');

      // Simulate backend creation outage
      orderRepo.setSimulateBackendFailure(true, 'Database connection timeout');

      const failedResult = await workflow.confirmOrder(testConvId);

      expect(failedResult.success).toBe(false);
      expect(failedResult.status).toBe('draft'); // MUST remain in draft!
      expect(failedResult.draft.status).toBe('draft');
      expect(failedResult.draft.customerConfirmed).toBe(false);
      expect(failedResult.draft.backendOrderId).toBeNull();
      expect(failedResult.backendOrder).toBeNull();
      expect(failedResult.error).toContain('Database connection timeout');
      expect(failedResult.prompt).toContain('no se realizó ningún cargo');

      // Verify no backend order was stored
      expect(orderRepo.getAllBackendOrders()).toHaveLength(0);

      // Now recover backend and re-confirm
      orderRepo.setSimulateBackendFailure(false);
      const recoveredResult = await workflow.confirmOrder(testConvId);

      expect(recoveredResult.success).toBe(true);
      expect(recoveredResult.status).toBe('confirmed');
      expect(recoveredResult.draft.customerConfirmed).toBe(true);
      expect(recoveredResult.draft.backendOrderId).toBeTruthy();
      expect(orderRepo.getAllBackendOrders()).toHaveLength(1);
    });
  });

  describe('8. Rule: Idempotent Retries & Duplicate Message Protection', () => {
    it('returns existing order without duplicate insertion on idempotent retry', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      await workflow.selectDelivery(testConvId, 'pickup');
      await workflow.setCustomerData(testConvId, { name: 'Idem User', email: 'idem@example.com' });
      await workflow.selectPayment(testConvId, 'transfer');

      const idemKey = 'idempotency_token_unique_999';

      // First confirmation
      const firstResult = await workflow.confirmOrder(testConvId, { idempotencyKey: idemKey });
      expect(firstResult.success).toBe(true);
      expect(firstResult.isDuplicate).toBe(false);
      const firstOrderId = firstResult.draft.backendOrderId;

      // Duplicate retry with same idempotencyKey
      const retryResult = await workflow.confirmOrder(testConvId, { idempotencyKey: idemKey });
      expect(retryResult.success).toBe(true);
      expect(retryResult.isDuplicate).toBe(true);
      expect(retryResult.draft.backendOrderId).toBe(firstOrderId);

      // Exactly ONE backend order must exist
      expect(orderRepo.getAllBackendOrders()).toHaveLength(1);
    });

    it('duplicate message IDs return already created order draft', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      await workflow.selectDelivery(testConvId, 'pickup');
      await workflow.setCustomerData(testConvId, { name: 'Dup User', email: 'dup@example.com' });
      await workflow.selectPayment(testConvId, 'cash');

      const messageId = 'mid.$unique_webhook_msg_555';

      // First confirmation
      const first = await workflow.confirmOrder(testConvId, { messageId });
      expect(first.isDuplicate).toBe(false);

      // Duplicate delivery of identical webhook message
      const second = await workflow.confirmOrder(testConvId, { messageId });
      expect(second.isDuplicate).toBe(true);
      expect(second.draft.backendOrderId).toBe(first.draft.backendOrderId);
      expect(orderRepo.getAllBackendOrders()).toHaveLength(1);
    });
  });

  describe('9. Rule: Preserve Existing Order Contracts', () => {
    it('creates backend order payload adhering strictly to server.ts database contract', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      await workflow.setQuantity(testConvId, 2);
      await workflow.selectDelivery(testConvId, 'shipping');
      await workflow.setCustomerData(testConvId, {
        name: 'Roberto Gomez',
        email: 'roberto@example.com',
        shippingAddress: {
          addressLine1: 'Av Reforma 500',
          city: 'CDMX',
          postalCode: '06500',
        },
      });
      await workflow.selectPayment(testConvId, 'stripe');

      const res = await workflow.confirmOrder(testConvId);
      expect(res.success).toBe(true);

      const contract = res.backendOrder;
      expect(contract).not.toBeNull();

      // Validate exact schema required by server.ts
      expect(contract?.store_id).toBe('store_black_relic_main');
      expect(contract?.customer_email).toBe('roberto@example.com');
      expect(contract?.status).toBe('pendiente');
      expect(contract?.subtotal).toBe(2998);
      expect(contract?.total).toBe(2998);
      expect(contract?.currency).toBe('mxn');
      expect(contract?.delivery_method).toBe('shipping');
      expect(contract?.payment_method).toBe('stripe');
      expect(contract?.order_items).toHaveLength(1);

      const itemContract = contract?.order_items[0];
      expect(itemContract?.product_id).toBe(hoodieProductId);
      expect(itemContract?.quantity).toBe(2);
      expect(itemContract?.unit_price).toBe(1499);
      expect(itemContract?.product_snapshot).toMatchObject({
        id: hoodieProductId,
        name: 'Sudadera Relic Heavyweight 500 GSM',
        baseName: 'Sudadera Relic Heavyweight 500 GSM',
        variantName: 'Negro / S',
        price: 1499,
      });

      expect(contract?.metadata).toMatchObject({
        source: 'meta_commerce_messaging',
        channel: 'instagram',
        conversation_id: testConvId,
      });
    });
  });

  describe('10. Inventory & Stock Guardrails', () => {
    it('prevents variant selection when variant is completely out of stock', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      const res = await workflow.selectVariant(testConvId, hoodieSizeMOOSVariantId);

      expect(res.success).toBe(false);
      expect(res.step).toBe('variant');
      expect(res.error).toContain('está agotada');
      expect(res.prompt).toContain('agotada en este momento');
    });

    it('prevents setting quantity greater than available stock', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId); // Stock: 8

      const res = await workflow.setQuantity(testConvId, 10); // Requesting 10 > 8
      expect(res.success).toBe(false);
      expect(res.step).toBe('quantity');
      expect(res.error).toContain('Inventario insuficiente');
      expect(res.prompt).toContain('Solo contamos con 8 pieza(s)');
    });

    it('rejects non-positive quantities', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      const zeroRes = await workflow.setQuantity(testConvId, 0);
      expect(zeroRes.success).toBe(false);

      const negRes = await workflow.setQuantity(testConvId, -5);
      expect(negRes.success).toBe(false);
    });
  });

  describe('11. Customer Data & Delivery Validations', () => {
    it('rejects invalid email formats', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      await workflow.selectDelivery(testConvId, 'pickup');

      const res = await workflow.setCustomerData(testConvId, {
        name: 'Test',
        email: 'invalid-email-string',
      });

      expect(res.success).toBe(false);
      expect(res.step).toBe('customer_data');
      expect(res.error).toContain('correo electrónico válido');
    });

    it('requires shipping address when delivery method is shipping', async () => {
      await workflow.selectProduct(testConvId, hoodieProductId);
      await workflow.selectVariant(testConvId, hoodieSizeSVariantId);
      await workflow.selectDelivery(testConvId, 'shipping');

      const res = await workflow.setCustomerData(testConvId, {
        name: 'Juan Perez',
        email: 'juan@example.com',
        shippingAddress: null,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('dirección de entrega es obligatoria');
    });
  });
});
