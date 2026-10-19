import { describe, expect, it } from 'vitest';
import {
  FulfillmentDialogueEngine,
  DEFAULT_BLACK_RELIC_CAPABILITIES,
  detectAndRedactCardData,
  isValidLuhn,
  maskAddress,
  maskCustomerName,
  maskEmail,
  maskPhone,
  sanitizeCustomerData,
  sanitizeFulfillmentLog,
  createFulfillmentLogEntry,
  OrderWorkflowService,
  InMemoryOrderDraftRepository,
  InMemoryCatalogRepository,
} from '../../../src/services/meta-commerce';
import type { CustomerInfo } from '../../../src/services/meta-commerce/order-types';

describe('AG-FULFILLMENT: Fulfillment & Payment Dialogue Engine', () => {
  const engine = new FulfillmentDialogueEngine();

  // =========================================================================
  // 1. SHIPPING DIALOGUE: NEVER INVENT SHIPPING PRICE / TIME
  // =========================================================================
  describe('1. Shipping Dialogue Logic & Price/Time Invariants', () => {
    it('applies standard flat rate of $150 MXN for orders under $2,000 MXN', () => {
      const response = engine.getShippingDialogue(500);

      expect(response.success).toBe(true);
      expect(response.confirmationRequired).toBe(false);
      expect(response.prompt).toContain('$150.00 MXN');
      expect(response.prompt).toContain('¡te faltan $1,500.00 MXN para envío GRATIS!');
      expect(response.technicalDetails?.feeMxn).toBe(150);
    });

    it('applies free shipping ($0 MXN) for orders reaching or exceeding $2,000 MXN', () => {
      const response = engine.getShippingDialogue(2400);

      expect(response.success).toBe(true);
      expect(response.confirmationRequired).toBe(false);
      expect(response.prompt).toContain('¡GRATIS!');
      expect(response.prompt).toContain('supera los $2,000.00 MXN');
    });

    it('provides standard authoritative delivery window (3 a 5 días) without inventing dates', () => {
      const response = engine.getShippingDialogue();

      expect(response.success).toBe(true);
      expect(response.prompt).toContain('de 3 a 5 días hábiles tras despacho');
      expect(response.prompt).toContain('Estafeta, FedEx, DHL');
    });

    it('never invents shipping price or time for unknown / extended zones; says confirmation is required', () => {
      const response = engine.getShippingDialogue(500, 'zona extendida Cozumel', '77600');

      expect(response.success).toBe(true);
      expect(response.confirmationRequired).toBe(true);
      expect(response.confirmationReason).toBe('destination_zone_requires_courier_quote');
      expect(response.prompt).toContain('el costo exacto y tiempo de entrega requieren confirmación previa con paquetería');
    });

    it('says confirmation is required when delivery time is unconfigured/unavailable', () => {
      const noTimeEngine = new FulfillmentDialogueEngine({
        delivery: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery,
          shipping: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery.shipping,
            standardDeliveryDays: null, // Delivery time unavailable
          },
        },
      });

      const response = noTimeEngine.getShippingDialogue(1200);

      expect(response.success).toBe(true);
      expect(response.confirmationRequired).toBe(true);
      expect(response.confirmationReason).toBe('delivery_time_unconfigured');
      expect(response.prompt).toContain('requieren confirmación previa con paquetería');
    });

    it('handles disabled shipping in store capabilities safely and requires confirmation', () => {
      const disabledShippingEngine = new FulfillmentDialogueEngine({
        delivery: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery,
          shipping: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery.shipping,
            enabled: false,
          },
        },
      });

      const response = disabledShippingEngine.getShippingDialogue();

      expect(response.success).toBe(false);
      expect(response.confirmationRequired).toBe(true);
      expect(response.confirmationReason).toBe('shipping_disabled_in_store_capabilities');
      expect(response.prompt).toContain('los envíos a domicilio no están habilitados');
    });
  });

  // =========================================================================
  // 2. PICKUP DIALOGUE: STORE CAPABILITIES & SCHEDULE CONFIRMATION
  // =========================================================================
  describe('2. Pickup Dialogue Logic & Store Capabilities', () => {
    it('provides showroom pickup details at $0.00 MXN without fee invention', () => {
      const response = engine.getPickupDialogue();

      expect(response.success).toBe(true);
      expect(response.confirmationRequired).toBe(false);
      expect(response.prompt).toContain('Showroom BLACK RELIC');
      expect(response.prompt).toContain('Colima 123, Roma Norte');
      expect(response.prompt).toContain('Lunes a Sábado de 11:00 a 19:00 hrs');
      expect(response.prompt).toContain('Costo: $0.00 MXN (Gratis)');
      expect(response.technicalDetails?.feeMxn).toBe(0);
    });

    it('says confirmation is required if showroom schedule is unavailable/unconfigured', () => {
      const noScheduleEngine = new FulfillmentDialogueEngine({
        delivery: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery,
          pickup: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery.pickup,
            schedule: null, // Schedule unavailable
          },
        },
      });

      const response = noScheduleEngine.getPickupDialogue();

      expect(response.success).toBe(true);
      expect(response.confirmationRequired).toBe(true);
      expect(response.confirmationReason).toBe('pickup_schedule_requires_confirmation');
      expect(response.prompt).toContain('Se requiere confirmación de horario con nuestro equipo antes de acudir');
    });

    it('handles disabled pickup capabilities safely', () => {
      const disabledPickupEngine = new FulfillmentDialogueEngine({
        delivery: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery,
          pickup: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery.pickup,
            enabled: false,
          },
        },
      });

      const response = disabledPickupEngine.getPickupDialogue();

      expect(response.success).toBe(false);
      expect(response.confirmationRequired).toBe(true);
      expect(response.confirmationReason).toBe('pickup_disabled_in_store_capabilities');
      expect(response.prompt).toContain('recolección en tienda no está disponible');
    });
  });

  // =========================================================================
  // 3. PAYMENT METHODS FROM STORE CAPABILITIES ONLY & TRANSFER/CASH RULES
  // =========================================================================
  describe('3. Payment Methods: Configured Store Capabilities & Gating', () => {
    it('presents all enabled payment methods by default', () => {
      const response = engine.getPaymentMethodsDialogue('pickup');

      expect(response.success).toBe(true);
      expect(response.prompt).toContain('Tarjeta de crédito o débito');
      expect(response.prompt).toContain('Transferencia interbancaria SPEI');
      expect(response.prompt).toContain('Efectivo');
      expect(response.technicalDetails?.availableOptions).toEqual(['stripe', 'transfer', 'cash']);
    });

    it('excludes cash from options when delivery is shipping and cash is allowed only for pickup', () => {
      const response = engine.getPaymentMethodsDialogue('shipping');

      expect(response.success).toBe(true);
      expect(response.prompt).toContain('Tarjeta de crédito o débito');
      expect(response.prompt).toContain('Transferencia interbancaria SPEI');
      expect(response.technicalDetails?.availableOptions).toEqual(['stripe', 'transfer']);
      expect(response.prompt).toContain('El pago en efectivo está reservado exclusivamente para recolección en tienda');
    });

    it('rejects cash selection when delivery is shipping and cash is pickup-only', () => {
      const response = engine.evaluatePaymentSelection('efectivo', 'shipping');

      expect(response.success).toBe(false);
      expect(response.confirmationReason).toBe('cash_not_allowed_for_shipping');
      expect(response.prompt).toContain('El pago en efectivo solo está disponible para recolección en tienda showroom');
    });

    it('accepts cash selection when delivery is pickup', () => {
      const response = engine.evaluatePaymentSelection('efectivo', 'pickup');

      expect(response.success).toBe(true);
      expect(response.prompt).toContain('Has seleccionado Pago en Efectivo al recoger en showroom');
      expect(response.prompt).toContain('liquidarlo en caja al momento de recibir tus prendas');
    });

    it('blocks transfer / SPEI when transfer capability is disabled', () => {
      const noTransferEngine = new FulfillmentDialogueEngine({
        payments: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.payments,
          transfer: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.payments.transfer,
            enabled: false,
          },
        },
      });

      const options = noTransferEngine.getPaymentMethodsDialogue('pickup');
      expect(options.technicalDetails?.availableOptions).not.toContain('transfer');

      const response = noTransferEngine.evaluatePaymentSelection('transferencia spei', 'pickup');
      expect(response.success).toBe(false);
      expect(response.confirmationReason).toBe('transfer_payment_disabled');
      expect(response.prompt).toContain('La transferencia electrónica no está habilitada en este momento');
    });

    it('blocks cash when cash capability is disabled', () => {
      const noCashEngine = new FulfillmentDialogueEngine({
        payments: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.payments,
          cash: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.payments.cash,
            enabled: false,
          },
        },
      });

      const options = noCashEngine.getPaymentMethodsDialogue('pickup');
      expect(options.technicalDetails?.availableOptions).not.toContain('cash');

      const response = noCashEngine.evaluatePaymentSelection('efectivo', 'pickup');
      expect(response.success).toBe(false);
      expect(response.confirmationReason).toBe('cash_payment_disabled');
      expect(response.prompt).toContain('El pago en efectivo no está disponible en este momento');
    });

    it('rejects unsupported payment methods (e.g. crypto, cheques, paypal) with clean list of supported options', () => {
      const response = engine.evaluatePaymentSelection('bitcoin cripto', 'pickup');

      expect(response.success).toBe(false);
      expect(response.confirmationReason).toBe('unsupported_payment_choice');
      expect(response.prompt).toContain('No contamos con esa forma de pago');
      expect(response.prompt).toContain('Tarjeta (enlace seguro)');
    });
  });

  // =========================================================================
  // 4. NO CARD DATA COLLECTION IN DM (DEFENSE & INTERCEPTION)
  // =========================================================================
  describe('4. No Card Data Collection in DM (Proactive Defense)', () => {
    it('explains hosted checkout link for card payments and warns never to send card digits', () => {
      const response = engine.evaluatePaymentSelection('tarjeta de credito', 'shipping', 'draft_123');

      expect(response.success).toBe(true);
      expect(response.prompt).toContain('Por tu seguridad, no compartas números de tarjeta en este chat');
      expect(response.prompt).toContain('enlace de pago seguro (https://selfcaresinners.com/checkout/draft_123)');
      expect(response.technicalDetails?.collectsCardInDm).toBe(false);
    });

    it('detects and redacts raw credit card numbers sent by customer in chat', () => {
      const userText = 'Hola, quiero pagar con mi tarjeta 4111 2222 3333 4444 por favor';
      const check = detectAndRedactCardData(userText);

      expect(check.containsCardData).toBe(true);
      expect(check.redactedText).not.toContain('4111');
      expect(check.redactedText).toContain('[PAN_REDACTED]');
      expect(check.detectedCardCount).toBe(1);
    });

    it('detects and redacts CVV codes in inbound customer messages', () => {
      const userText = 'mi tarjeta es 4532-0150-1234-5678 cvv 892 exp 12/28';
      const check = detectAndRedactCardData(userText);

      expect(check.containsCardData).toBe(true);
      expect(check.redactedText).not.toContain('4532');
      expect(check.redactedText).not.toContain('892');
      expect(check.redactedText).toContain('[PAN_REDACTED]');
      expect(check.redactedText).toContain('[CVV_REDACTED]');
      expect(check.redactedText).toContain('[EXP_REDACTED]');
    });

    it('returns immediate security warning prompt when customer sends card data in message', () => {
      const response = engine.processFulfillmentMessage(
        'Mi tarjeta es 4111222233334444 para cobrar',
        'payment_choice',
      );

      expect(response.success).toBe(false);
      expect(response.securityWarning).toBe('card_data_detected_and_redacted');
      expect(response.prompt).toContain('nunca compartas números de tarjeta ni códigos de seguridad en este chat');
      expect(response.prompt).toContain('enlace de pago oficial y protegido');
    });

    it('validates Luhn algorithm accurately for card number filtering', () => {
      // Valid Visa Luhn
      expect(isValidLuhn('4532015012345678')).toBe(false); // bad checksum test
      // Test known valid Luhn formula
      expect(isValidLuhn('49927398716')).toBe(true);
      expect(isValidLuhn('1234567812345670')).toBe(true);
      // Bad length
      expect(isValidLuhn('123')).toBe(false);
    });
  });

  // =========================================================================
  // 5. MINIMUM CUSTOMER DATA: PICKUP VS SHIPPING
  // =========================================================================
  describe('5. Minimum Customer Data (Data Minimization Principle)', () => {
    it('for pickup: requires ONLY name and valid email; does not require address or phone', () => {
      const minimalPickupData = {
        name: 'Sofia Reyes',
        email: 'sofia.reyes@example.com',
      };

      const result = engine.validateMinimumCustomerData('pickup', minimalPickupData);

      expect(result.valid).toBe(true);
      expect(result.success).toBe(true);
      expect(result.collectedData?.name).toBe('Sofia Reyes');
      expect(result.collectedData?.email).toBe('sofia.reyes@example.com');
      expect(result.collectedData?.shippingAddress).toBeNull();
      expect(result.missingFields).toBeUndefined();
    });

    it('for pickup: strips shipping address if accidentally passed to guarantee data minimization', () => {
      const excessivePickupData = {
        name: 'Mateo Ortiz',
        email: 'mateo@example.com',
        shippingAddress: {
          addressLine1: 'Av. Insurgentes Sur 1602',
          city: 'CDMX',
          postalCode: '03900',
        },
      };

      const result = engine.validateMinimumCustomerData('pickup', excessivePickupData);

      expect(result.valid).toBe(true);
      expect(result.collectedData?.shippingAddress).toBeNull();
    });

    it('for pickup: rejects when name is missing and gives helpful minimal prompt', () => {
      const missingName = {
        name: '',
        email: 'test@example.com',
      };

      const result = engine.validateMinimumCustomerData('pickup', missingName);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('name');
      expect(result.prompt).toContain('Tu nombre completo para identificarte en mostrador');
      expect(result.prompt).not.toContain('dirección');
    });

    it('for shipping: enforces name, email, phone (courier), and complete shipping address', () => {
      const completeShippingData: CustomerInfo = {
        name: 'Valeria Gomez',
        email: 'valeria@example.com',
        phone: '+52 55 9876 5432',
        shippingAddress: {
          addressLine1: 'Calle Orizaba 42, Int 301',
          city: 'Cuauhtémoc',
          state: 'CDMX',
          postalCode: '06700',
        },
      };

      const result = engine.validateMinimumCustomerData('shipping', completeShippingData);

      expect(result.valid).toBe(true);
      expect(result.success).toBe(true);
      expect(result.collectedData?.name).toBe('Valeria Gomez');
      expect(result.collectedData?.phone).toBe('+52 55 9876 5432');
      expect(result.collectedData?.shippingAddress?.addressLine1).toBe('Calle Orizaba 42, Int 301');
    });

    it('for shipping: rejects when phone or address are missing', () => {
      const incompleteShipping = {
        name: 'Valeria Gomez',
        email: 'valeria@example.com',
      };

      const result = engine.validateMinimumCustomerData('shipping', incompleteShipping);

      expect(result.valid).toBe(false);
      expect(result.missingFields).toContain('phone');
      expect(result.missingFields).toContain('shippingAddress');
      expect(result.prompt).toContain('Teléfono de contacto para el repartidor');
      expect(result.prompt).toContain('Dirección completa de entrega');
    });
  });

  // =========================================================================
  // 6. SANITIZED PII IN LOGS & AUDIT TRAILS
  // =========================================================================
  describe('6. Sanitized PII in Logs and Audit Trails', () => {
    it('masks email addresses preserving only first and last characters and domain', () => {
      expect(maskEmail('carlos.mendoza@gmail.com')).toBe('c***a@gmail.com');
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
      expect(maskEmail('')).toBe('[NO_EMAIL]');
    });

    it('masks phone numbers preserving prefix and last 4 digits', () => {
      expect(maskPhone('+52 55 1234 5678')).toBe('+52 55 **** 5678');
      expect(maskPhone('5512345678')).toBe('5512 **** 5678');
      expect(maskPhone(null)).toBe('[NO_PHONE]');
    });

    it('masks customer names preserving initials', () => {
      expect(maskCustomerName('Carlos Mendoza')).toBe('C***s M***a');
      expect(maskCustomerName('Ana')).toBe('A***a');
      expect(maskCustomerName('')).toBe('[NO_NAME]');
    });

    it('masks shipping addresses while retaining city and state for logistics routing audits', () => {
      const address = {
        addressLine1: 'Colima 123',
        city: 'Cuauhtémoc',
        state: 'CDMX',
        postalCode: '06700',
      };

      const masked = maskAddress(address);
      expect(masked).not.toContain('Colima 123');
      expect(masked).toContain('Calle C***');
      expect(masked).toContain('Cuauhtémoc');
      expect(masked).toContain('CDMX');
      expect(masked).toContain('CP 06***');
    });

    it('deep-sanitizes nested customer objects for logging without mutating raw data', () => {
      const sensitivePayload = {
        customer: {
          fullName: 'Rodrigo Hernandez',
          email: 'rodrigo.h@example.com',
          phone: '+52 55 4321 8765',
          shippingAddress: {
            addressLine1: 'Paseo de la Reforma 222',
            city: 'Juárez',
            state: 'CDMX',
            postalCode: '06600',
          },
        },
        cardDetails: {
          cardNumber: '4111222233334444',
          cvv: '999',
        },
      };

      const sanitized = sanitizeFulfillmentLog(sensitivePayload);

      expect((sanitized as any).customer.fullName).toBe('R***o H***z');
      expect((sanitized as any).customer.email).toBe('r***h@example.com');
      expect((sanitized as any).customer.phone).toBe('+52 55 **** 8765');
      expect((sanitized as any).cardDetails.cardNumber).toBe('[REDACTED]');
      expect((sanitized as any).cardDetails.cvv).toBe('[REDACTED]');

      // Raw object is intact
      expect(sensitivePayload.customer.fullName).toBe('Rodrigo Hernandez');
    });

    it('creates compliant audit log entries with ISO timestamp and sanitized payload', () => {
      const entry = createFulfillmentLogEntry('payment_selected', 'conv_abc123', {
        customerEmail: 'buyer@store.com',
        paymentMethod: 'stripe',
      });

      expect(entry.action).toBe('payment_selected');
      expect(entry.conversationId).toBe('conv_abc123');
      expect(entry.data.customerEmail).toBe('b***r@store.com');
      expect(entry.data.paymentMethod).toBe('stripe');
      expect(new Date(entry.timestamp).getTime()).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // 7. END-TO-END INTEGRATION WITH ORDER WORKFLOW SERVICE
  // =========================================================================
  describe('7. OrderWorkflowService Integration with Store Capabilities', () => {
    it('OrderWorkflowService respects store capabilities: blocks cash for shipping when restricted to pickup', async () => {
      const orderRepo = new InMemoryOrderDraftRepository();
      const catalogRepo = new InMemoryCatalogRepository();

      const workflowService = new OrderWorkflowService(
        orderRepo,
        catalogRepo,
        undefined,
        DEFAULT_BLACK_RELIC_CAPABILITIES,
      );

      // Setup draft up to payment step
      await workflowService.selectProduct('conv_test_caps', 'prod_hoodie_001');
      await workflowService.selectVariant('conv_test_caps', 'var_hoodie_negro_m');
      await workflowService.setQuantity('conv_test_caps', 1);
      await workflowService.selectDelivery('conv_test_caps', 'shipping', {
        addressLine1: 'Colima 123',
        city: 'CDMX',
        postalCode: '06700',
      });
      await workflowService.setCustomerData('conv_test_caps', {
        name: 'Juan Perez',
        email: 'juan@example.com',
        phone: '+52 55 1234 5678',
        shippingAddress: {
          addressLine1: 'Colima 123',
          city: 'CDMX',
          postalCode: '06700',
        },
      });

      // Attempt cash payment with shipping delivery method
      const paymentResult = await workflowService.selectPayment('conv_test_caps', 'cash');

      expect(paymentResult.success).toBe(false);
      expect(paymentResult.error).toContain('El pago en efectivo solo está disponible para recolección en tienda');
      expect(paymentResult.prompt).toContain('El pago en efectivo solo está disponible para recolección en tienda');
    });

    it('OrderWorkflowService strips shipping address for pickup to preserve data minimization', async () => {
      const orderRepo = new InMemoryOrderDraftRepository();
      const catalogRepo = new InMemoryCatalogRepository();

      const workflowService = new OrderWorkflowService(
        orderRepo,
        catalogRepo,
        undefined,
        DEFAULT_BLACK_RELIC_CAPABILITIES,
      );

      await workflowService.selectProduct('conv_test_pickup', 'prod_hoodie_001');
      await workflowService.selectVariant('conv_test_pickup', 'var_hoodie_negro_m');
      await workflowService.setQuantity('conv_test_pickup', 1);
      await workflowService.selectDelivery('conv_test_pickup', 'pickup');

      const customerResult = await workflowService.setCustomerData('conv_test_pickup', {
        name: 'Maria Lopez',
        email: 'maria@example.com',
        // Inadvertently provided shipping address
        shippingAddress: {
          addressLine1: 'Calle 10 # 50',
          city: 'CDMX',
          postalCode: '03100',
        },
      });

      expect(customerResult.success).toBe(true);
      expect(customerResult.draft.shippingAddress).toBeNull();
      expect(customerResult.draft.customer?.shippingAddress).toBeNull();
    });

    it('OrderWorkflowService blocks disabled delivery methods', async () => {
      const orderRepo = new InMemoryOrderDraftRepository();
      const catalogRepo = new InMemoryCatalogRepository();

      const noShippingCapabilities = {
        ...DEFAULT_BLACK_RELIC_CAPABILITIES,
        delivery: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery,
          shipping: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery.shipping,
            enabled: false,
          },
        },
      };

      const workflowService = new OrderWorkflowService(
        orderRepo,
        catalogRepo,
        undefined,
        noShippingCapabilities,
      );

      await workflowService.selectProduct('conv_test_disabled', 'prod_hoodie_001');
      await workflowService.selectVariant('conv_test_disabled', 'var_hoodie_negro_m');
      await workflowService.setQuantity('conv_test_disabled', 1);

      const deliveryResult = await workflowService.selectDelivery('conv_test_disabled', 'shipping');

      expect(deliveryResult.success).toBe(false);
      expect(deliveryResult.error).toContain('Los envíos a domicilio no están habilitados');
    });
  });
});
