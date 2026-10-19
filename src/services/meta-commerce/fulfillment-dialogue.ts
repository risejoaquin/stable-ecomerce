import { formatCurrencyMxn } from './catalog-resolver';
import {
  type CustomerInfo,
  type DeliveryMethod,
  type PaymentChoice,
  type OrderWorkflowStep,
  CustomerInfoSchema,
  DEFAULT_SHIPPING_FEE_MXN,
  FREE_SHIPPING_THRESHOLD_MXN,
} from './order-types';
import {
  type StoreFulfillmentCapabilities,
  type FulfillmentDialogueResponse,
  DEFAULT_BLACK_RELIC_CAPABILITIES,
  StoreFulfillmentCapabilitiesSchema,
} from './fulfillment-types';
import {
  createFulfillmentLogEntry,
  detectAndRedactCardData,
  maskAddress,
  maskCustomerName,
  maskEmail,
  maskPhone,
  sanitizeCustomerData,
  sanitizeFulfillmentLog,
} from './fulfillment-sanitizer';

/**
 * Fulfillment and Payment Selection Dialogue Engine.
 * Enforces strict, non-destructive safety invariants:
 * 1. Never invent shipping price/time.
 * 2. If unavailable, say confirmation is required.
 * 3. Payment methods from configured store capabilities only.
 * 4. No card data collection in DM (proactive interception & defense).
 * 5. Transfer/cash only when enabled (and cash restricted to pickup if configured).
 * 6. Minimum customer data (differentiating pickup vs shipping).
 * 7. Sanitized PII in all emitted logs and audit trails.
 */
export class FulfillmentDialogueEngine {
  private readonly capabilities: StoreFulfillmentCapabilities;

  constructor(customCapabilities?: Partial<StoreFulfillmentCapabilities>) {
    if (customCapabilities) {
      const merged = {
        ...DEFAULT_BLACK_RELIC_CAPABILITIES,
        ...customCapabilities,
        delivery: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery,
          ...(customCapabilities.delivery || {}),
          shipping: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery.shipping,
            ...(customCapabilities.delivery?.shipping || {}),
          },
          pickup: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.delivery.pickup,
            ...(customCapabilities.delivery?.pickup || {}),
          },
        },
        payments: {
          ...DEFAULT_BLACK_RELIC_CAPABILITIES.payments,
          ...(customCapabilities.payments || {}),
          stripe: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.payments.stripe,
            ...(customCapabilities.payments?.stripe || {}),
          },
          transfer: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.payments.transfer,
            ...(customCapabilities.payments?.transfer || {}),
          },
          cash: {
            ...DEFAULT_BLACK_RELIC_CAPABILITIES.payments.cash,
            ...(customCapabilities.payments?.cash || {}),
          },
        },
      };
      this.capabilities = StoreFulfillmentCapabilitiesSchema.parse(merged);
    } else {
      this.capabilities = StoreFulfillmentCapabilitiesSchema.parse(DEFAULT_BLACK_RELIC_CAPABILITIES);
    }
  }

  /**
   * Retrieves the current immutable store capabilities.
   */
  getCapabilities(): Readonly<StoreFulfillmentCapabilities> {
    return this.capabilities;
  }

  /**
   * Intercepts inbound customer text to defend against card data leakage in DM.
   * If customer sends credit card digits or CVV, returns immediate redaction and security warning.
   */
  inspectInboundMessageForCardData(text: string): {
    containsCardData: boolean;
    sanitizedText: string;
    warningPrompt?: string;
  } {
    const cardCheck = detectAndRedactCardData(text);
    if (!cardCheck.containsCardData) {
      return {
        containsCardData: false,
        sanitizedText: text,
      };
    }

    const warningPrompt =
      '🛡️ Por tu seguridad y protección de datos bancarios, nunca compartas números de tarjeta ni códigos de seguridad en este chat. Hemos eliminado esa información confidencial. Para pagar con tarjeta te compartiremos un enlace de pago oficial y protegido.';

    return {
      containsCardData: true,
      sanitizedText: cardCheck.redactedText,
      warningPrompt,
    };
  }

  /**
   * Generates dialogue information regarding shipping policies and rates.
   * STRICT INVARIANT: Never invent shipping price or delivery time.
   * If zone or delivery time is unavailable, explicitly declares that confirmation is required.
   */
  getShippingDialogue(
    subtotal?: number,
    destinationZone?: string,
    postalCode?: string,
  ): FulfillmentDialogueResponse {
    const shippingConfig = this.capabilities.delivery.shipping;

    if (!shippingConfig.enabled) {
      return {
        success: false,
        prompt:
          'Por el momento los envíos a domicilio no están habilitados. Contamos con recolección en tienda o podemos consultar excepciones con nuestro equipo.',
        confirmationRequired: true,
        confirmationReason: 'shipping_disabled_in_store_capabilities',
        technicalDetails: { enabled: false },
        sanitizedLogPayload: createFulfillmentLogEntry('shipping_query', 'system', {
          shippingEnabled: false,
        }).data,
      };
    }

    // 1. Zone Check: Is this a custom / extended / unverified zone?
    let confirmationRequired = false;
    let confirmationReason: string | undefined;
    let feeMxn = shippingConfig.flatRateMxn;
    let timeEstimateText = '';

    if (destinationZone) {
      const normalizedZone = destinationZone.toLowerCase().trim();
      const isKnown = shippingConfig.knownZones && shippingConfig.knownZones[normalizedZone];

      if (isKnown) {
        feeMxn = isKnown.feeMxn;
        timeEstimateText = isKnown.estimateDays;
      } else if (
        normalizedZone.includes('extendida') ||
        normalizedZone.includes('internacional') ||
        normalizedZone.includes('isla') ||
        normalizedZone.includes('remota') ||
        shippingConfig.requireConfirmationIfUnknownZone
      ) {
        // Unknown or extended zone: NEVER INVENT SHIPPING PRICE OR TIME
        confirmationRequired = true;
        confirmationReason = 'destination_zone_requires_courier_quote';
      }
    }

    // 2. Delivery Time: Authoritative or requires confirmation?
    if (!timeEstimateText) {
      if (shippingConfig.standardDeliveryDays) {
        const { min, max } = shippingConfig.standardDeliveryDays;
        timeEstimateText = `de ${min} a ${max} días hábiles tras despacho`;
      } else {
        // Delivery time is unavailable: NEVER INVENT DELIVERY TIME
        confirmationRequired = true;
        confirmationReason = confirmationReason || 'delivery_time_unconfigured';
      }
    }

    // 3. Free Shipping Threshold Check
    let priceText: string;
    if (typeof subtotal === 'number') {
      if (subtotal >= shippingConfig.freeShippingThresholdMxn) {
        priceText = '¡GRATIS! (tu compra supera los ' + formatCurrencyMxn(shippingConfig.freeShippingThresholdMxn) + ')';
      } else {
        const gap = shippingConfig.freeShippingThresholdMxn - subtotal;
        priceText = `${formatCurrencyMxn(feeMxn)} (¡te faltan ${formatCurrencyMxn(gap)} para envío GRATIS!)`;
      }
    } else {
      priceText = `${formatCurrencyMxn(feeMxn)} (o GRATIS en compras a partir de ${formatCurrencyMxn(shippingConfig.freeShippingThresholdMxn)})`;
    }

    // 4. Build Authoritative Prompt
    let prompt: string;
    const carriers = shippingConfig.carrierPartners.join(', ');

    if (confirmationRequired) {
      prompt =
        `Realizamos envíos a toda la República Mexicana a través de ${carriers}. Tarifa estándar nacional: ${priceText}.\n` +
        `⚠️ Nota importante: Para la zona o código postal indicado (${postalCode || destinationZone || 'zona especial'}), el costo exacto y tiempo de entrega requieren confirmación previa con paquetería antes de procesar el pedido.`;
    } else {
      prompt =
        `Realizamos envíos a toda la República Mexicana a través de ${carriers}.\n` +
        `• Costo de envío: ${priceText}.\n` +
        `• Tiempo estimado de entrega: ${timeEstimateText}.\n` +
        `¿Te gustaría continuar con envío a domicilio?`;
    }

    return {
      success: true,
      prompt,
      confirmationRequired,
      confirmationReason,
      technicalDetails: {
        feeMxn,
        freeShippingThresholdMxn: shippingConfig.freeShippingThresholdMxn,
        carriers: shippingConfig.carrierPartners,
        zone: destinationZone || 'standard_national',
      },
      sanitizedLogPayload: createFulfillmentLogEntry('shipping_dialogue_evaluated', 'system', {
        destinationZone: destinationZone || 'national',
        confirmationRequired,
        confirmationReason,
        subtotal,
      }).data,
      suggestedAction: 'select_delivery',
    };
  }

  /**
   * Generates dialogue information regarding pickup in showroom / store.
   * If showroom schedule is unavailable, says confirmation is required before pickup.
   */
  getPickupDialogue(): FulfillmentDialogueResponse {
    const pickupConfig = this.capabilities.delivery.pickup;

    if (!pickupConfig.enabled) {
      return {
        success: false,
        prompt:
          'Por el momento la recolección en tienda no está disponible. Ofrecemos envíos a domicilio a toda la República.',
        confirmationRequired: true,
        confirmationReason: 'pickup_disabled_in_store_capabilities',
        technicalDetails: { enabled: false },
        sanitizedLogPayload: createFulfillmentLogEntry('pickup_query', 'system', {
          pickupEnabled: false,
        }).data,
      };
    }

    let confirmationRequired = false;
    let confirmationReason: string | undefined;
    let scheduleText = pickupConfig.schedule;

    if (!scheduleText || pickupConfig.requireConfirmationIfUnknownSchedule && scheduleText === null) {
      confirmationRequired = true;
      confirmationReason = 'pickup_schedule_requires_confirmation';
      scheduleText = 'Horario pendiente de confirmación con nuestro equipo';
    }

    let prompt =
      `Puedes recolectar tu pedido sin costo en nuestro showroom:\n` +
      `📍 Ubicación: ${pickupConfig.locationName} (${pickupConfig.address})\n` +
      `🕒 Horario: ${scheduleText}\n` +
      `💵 Costo: $0.00 MXN (Gratis).\n`;

    if (confirmationRequired) {
      prompt += `⚠️ Nota: Se requiere confirmación de horario con nuestro equipo antes de acudir para asegurar que tus prendas estén listas.`;
    } else {
      prompt += `¿Prefieres recolección en showroom o envío a domicilio?`;
    }

    return {
      success: true,
      prompt,
      confirmationRequired,
      confirmationReason,
      technicalDetails: {
        feeMxn: 0,
        locationName: pickupConfig.locationName,
        address: pickupConfig.address,
      },
      sanitizedLogPayload: createFulfillmentLogEntry('pickup_dialogue_evaluated', 'system', {
        locationName: pickupConfig.locationName,
        confirmationRequired,
        confirmationReason,
      }).data,
      suggestedAction: 'select_delivery',
    };
  }

  /**
   * Generates payment selection dialogue strictly using configured store capabilities.
   * STRICT INVARIANTS:
   * - Payment methods from configured capabilities only.
   * - No card data collection in DM.
   * - Transfer/cash only when enabled.
   * - Cash restricted to pickup if allowedOnlyForPickup is configured.
   */
  getPaymentMethodsDialogue(deliveryMethod?: DeliveryMethod | null): FulfillmentDialogueResponse {
    const payments = this.capabilities.payments;
    const availableOptions: string[] = [];
    const optionDescriptions: string[] = [];

    // 1. Stripe / Card
    if (payments.stripe.enabled) {
      availableOptions.push('stripe');
      optionDescriptions.push(
        '1) Tarjeta de crédito o débito: te generaremos un enlace oficial y seguro (cifrado SSL 256-bit). Nunca solicitamos números de tarjeta en este chat.',
      );
    }

    // 2. Transfer / SPEI
    if (payments.transfer.enabled) {
      availableOptions.push('transfer');
      optionDescriptions.push(
        `2) Transferencia interbancaria SPEI (${payments.transfer.bankName || 'Banco nacional'}): te proporcionaremos CLABE y concepto para realizar tu pago.`,
      );
    }

    // 3. Cash
    if (payments.cash.enabled) {
      if (payments.cash.allowedOnlyForPickup && deliveryMethod === 'shipping') {
        // Restricted: cash cannot be used for shipping
      } else {
        availableOptions.push('cash');
        const cashContext = deliveryMethod === 'pickup' ? 'al recoger en showroom' : 'contra entrega';
        optionDescriptions.push(`3) Efectivo: pago directo ${cashContext}.`);
      }
    }

    if (availableOptions.length === 0) {
      return {
        success: false,
        prompt:
          'Actualmente nuestros métodos de pago están en mantenimiento. Un asesor humano te contactará de inmediato.',
        confirmationRequired: true,
        confirmationReason: 'no_payment_methods_enabled',
        technicalDetails: { availableOptions: [] },
        suggestedAction: 'human_handoff',
      };
    }

    let prompt = `Contamos con las siguientes opciones de pago seguras:\n${optionDescriptions.join('\n')}\n\n¿Cuál prefieres para completar tu pedido?`;

    if (payments.cash.enabled && payments.cash.allowedOnlyForPickup && deliveryMethod === 'shipping') {
      prompt += `\n(Nota: El pago en efectivo está reservado exclusivamente para recolección en tienda).`;
    }

    return {
      success: true,
      prompt,
      confirmationRequired: false,
      technicalDetails: {
        availableOptions,
        deliveryMethod: deliveryMethod || 'unselected',
      },
      sanitizedLogPayload: createFulfillmentLogEntry('payment_options_presented', 'system', {
        availableOptions,
        deliveryMethod,
      }).data,
      suggestedAction: 'select_payment',
    };
  }

  /**
   * Validates customer data against the principle of MINIMUM NECESSARY DATA.
   * - Pickup requires ONLY: full name and email (optional phone). Address is NOT requested or required.
   * - Shipping requires: full name, email, phone (for courier dispatch), and complete shipping address.
   */
  validateMinimumCustomerData(
    deliveryMethod: DeliveryMethod,
    input: unknown,
  ): FulfillmentDialogueResponse & { valid: boolean; data?: CustomerInfo } {
    if (!input || typeof input !== 'object') {
      return {
        valid: false,
        success: false,
        prompt:
          deliveryMethod === 'pickup'
            ? 'Para tu recolección en showroom, por favor compártenos tu nombre completo y correo electrónico para enviarte tu comprobante.'
            : 'Para tu envío a domicilio, compártenos tu nombre completo, correo, teléfono y dirección completa.',
        confirmationRequired: false,
        missingFields: ['name', 'email', ...(deliveryMethod === 'shipping' ? ['phone', 'shippingAddress'] : [])],
        suggestedAction: 'provide_customer_data',
      };
    }

    const raw = input as Record<string, unknown>;
    const missingFields: string[] = [];

    // Full Name check (minimum 1 character)
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    if (!name) {
      missingFields.push('name');
    }

    // Email check (RFC 5322 format via Zod)
    const email = typeof raw.email === 'string' ? raw.email.trim() : '';
    const emailCheck = CustomerInfoSchema.shape.email.safeParse(email);
    if (!emailCheck.success) {
      missingFields.push('email');
    }

    // Phone check: required for shipping (courier requirement), optional for pickup
    const phone = typeof raw.phone === 'string' ? raw.phone.trim() : null;
    if (deliveryMethod === 'shipping') {
      if (!phone || phone.length < 8) {
        missingFields.push('phone');
      }
    }

    // Shipping address check: ONLY required for shipping! Never required for pickup.
    let shippingAddress = raw.shippingAddress as any;
    if (deliveryMethod === 'shipping') {
      if (!shippingAddress) {
        missingFields.push('shippingAddress');
      } else {
        const line1 = shippingAddress.addressLine1 || shippingAddress.rawText || '';
        if (typeof line1 !== 'string' || line1.trim().length < 5) {
          missingFields.push('shippingAddress_line1');
        }
      }
    } else {
      // Pickup: strip any address that was inadvertently passed to guarantee data minimization
      shippingAddress = null;
    }

    if (missingFields.length > 0) {
      let prompt: string;
      if (deliveryMethod === 'pickup') {
        prompt = `Para tener listo tu pedido en showroom necesitamos los siguientes datos mínimos:\n`;
        if (missingFields.includes('name')) prompt += '• Tu nombre completo para identificarte en mostrador.\n';
        if (missingFields.includes('email')) prompt += '• Un correo electrónico válido para tu comprobante de compra.\n';
      } else {
        prompt = `Para coordinar la entrega con la paquetería necesitamos los siguientes datos indispensables:\n`;
        if (missingFields.includes('name')) prompt += '• Nombre completo del destinatario.\n';
        if (missingFields.includes('email')) prompt += '• Correo electrónico para el rastreo y comprobante.\n';
        if (missingFields.includes('phone')) prompt += '• Teléfono de contacto para el repartidor.\n';
        if (missingFields.includes('shippingAddress') || missingFields.includes('shippingAddress_line1')) {
          prompt += '• Dirección completa de entrega (calle, número ext/int, colonia, municipio/alcaldía, estado y código postal).\n';
        }
      }

      return {
        valid: false,
        success: false,
        prompt: prompt.trim(),
        confirmationRequired: false,
        missingFields,
        suggestedAction: 'provide_customer_data',
        sanitizedLogPayload: createFulfillmentLogEntry('customer_data_validation_failed', 'system', {
          deliveryMethod,
          missingFields,
        }).data,
      };
    }

    const validatedCustomer: CustomerInfo = {
      name,
      email,
      phone,
      shippingAddress: deliveryMethod === 'shipping' ? shippingAddress : null,
    };

    const sanitizedLog = sanitizeCustomerData(validatedCustomer);

    const prompt =
      deliveryMethod === 'pickup'
        ? `Gracias ${maskCustomerName(name)}. Registramos tus datos de recolección en showroom. ¿Con qué método te gustaría realizar tu pago?`
        : `Gracias ${maskCustomerName(name)}. Registramos tus datos de entrega en ${maskAddress(shippingAddress)}. ¿Con qué método te gustaría realizar tu pago?`;

    return {
      valid: true,
      success: true,
      prompt,
      confirmationRequired: false,
      collectedData: validatedCustomer,
      sanitizedLogPayload: createFulfillmentLogEntry('customer_data_validated', 'system', {
        deliveryMethod,
        sanitizedCustomer: sanitizedLog,
      }).data,
      suggestedAction: 'select_payment',
    };
  }

  /**
   * Evaluates payment selection against store capabilities.
   * Returns exact instructions and protects against card data collection.
   */
  evaluatePaymentSelection(
    paymentChoice: string,
    deliveryMethod?: DeliveryMethod | null,
    orderDraftId?: string,
  ): FulfillmentDialogueResponse {
    const normalized = paymentChoice.toLowerCase().trim();
    const payments = this.capabilities.payments;

    // 1. Stripe / Card
    if (
      normalized.includes('tarjeta') ||
      normalized.includes('stripe') ||
      normalized.includes('debito') ||
      normalized.includes('credito') ||
      normalized.includes('link')
    ) {
      if (!payments.stripe.enabled) {
        return {
          success: false,
          prompt: 'El pago con tarjeta no está disponible en este momento. Por favor selecciona otra opción de pago.',
          confirmationRequired: true,
          confirmationReason: 'stripe_payment_disabled',
        };
      }

      const checkoutUrl = payments.stripe.checkoutUrlTemplate.replace(
        ':orderId',
        orderDraftId || 'draft',
      );

      const prompt =
        `Has seleccionado pago con tarjeta.\n` +
        `🛡️ Por tu seguridad, no compartas números de tarjeta en este chat.\n` +
        `Al confirmar tu pedido, te proporcionaremos tu enlace de pago seguro (${checkoutUrl}) para que ingreses tus datos directamente en nuestra pasarela protegida.\n\n` +
        `¿Confirmas tu pedido con esta opción? (Responde "Sí, confirmar").`;

      return {
        success: true,
        prompt,
        confirmationRequired: false,
        technicalDetails: {
          paymentMethod: 'stripe',
          collectsCardInDm: false,
          checkoutUrl,
        },
        sanitizedLogPayload: createFulfillmentLogEntry('payment_selected', 'system', {
          paymentMethod: 'stripe',
        }).data,
        suggestedAction: 'confirm_order',
      };
    }

    // 2. Transfer / SPEI
    if (
      normalized.includes('transferencia') ||
      normalized.includes('spei') ||
      normalized.includes('banco') ||
      normalized.includes('clabe') ||
      normalized.includes('deposito')
    ) {
      if (!payments.transfer.enabled) {
        return {
          success: false,
          prompt:
            'La transferencia electrónica no está habilitada en este momento. Opciones disponibles: Tarjeta (enlace seguro).',
          confirmationRequired: false,
          confirmationReason: 'transfer_payment_disabled',
          suggestedAction: 'select_payment',
        };
      }

      const transfer = payments.transfer;
      const prompt =
        `Has seleccionado Transferencia Electrónica SPEI.\n` +
        `Datos de depósito:\n` +
        `• Banco: ${transfer.bankName}\n` +
        `• CLABE: ${transfer.clabe}\n` +
        `• Beneficiario: ${transfer.accountHolder}\n` +
        `• Concepto / Referencia: Se asignará con tu número de orden al confirmar.\n\n` +
        `Tu pedido se reservará en estatus "pendiente" hasta que confirmemos la recepción de tu transferencia.\n` +
        `¿Confirmas tu pedido? (Responde "Sí, confirmar").`;

      return {
        success: true,
        prompt,
        confirmationRequired: false,
        technicalDetails: {
          paymentMethod: 'transfer',
          clabe: transfer.clabe,
          bankName: transfer.bankName,
        },
        sanitizedLogPayload: createFulfillmentLogEntry('payment_selected', 'system', {
          paymentMethod: 'transfer',
        }).data,
        suggestedAction: 'confirm_order',
      };
    }

    // 3. Cash
    if (
      normalized.includes('efectivo') ||
      normalized.includes('cash') ||
      normalized.includes('contra entrega')
    ) {
      if (!payments.cash.enabled) {
        return {
          success: false,
          prompt:
            'El pago en efectivo no está disponible en este momento. Puedes pagar con tarjeta (enlace seguro) o transferencia SPEI.',
          confirmationRequired: false,
          confirmationReason: 'cash_payment_disabled',
          suggestedAction: 'select_payment',
        };
      }

      if (payments.cash.allowedOnlyForPickup && deliveryMethod === 'shipping') {
        return {
          success: false,
          prompt:
            'El pago en efectivo solo está disponible para recolección en tienda showroom. Para envío a domicilio contamos con pago mediante tarjeta o transferencia SPEI. ¿Cuál prefieres?',
          confirmationRequired: false,
          confirmationReason: 'cash_not_allowed_for_shipping',
          suggestedAction: 'select_payment',
        };
      }

      const prompt =
        deliveryMethod === 'pickup'
          ? `Has seleccionado Pago en Efectivo al recoger en showroom.\n` +
            `Tu pedido se apartará y podrás liquidarlo en caja al momento de recibir tus prendas.\n\n` +
            `¿Confirmas tu pedido? (Responde "Sí, confirmar").`
          : `Has seleccionado Pago en Efectivo contra entrega.\n` +
            `Tu pedido se preparará y liquidarás al repartidor al momento de recibir tu paquete.\n\n` +
            `¿Confirmas tu pedido? (Responde "Sí, confirmar").`;

      return {
        success: true,
        prompt,
        confirmationRequired: false,
        technicalDetails: {
          paymentMethod: 'cash',
          allowedOnlyForPickup: payments.cash.allowedOnlyForPickup,
        },
        sanitizedLogPayload: createFulfillmentLogEntry('payment_selected', 'system', {
          paymentMethod: 'cash',
        }).data,
        suggestedAction: 'confirm_order',
      };
    }

    // 4. Unsupported Payment Methods (e.g., PayPal, OXXO, crypto, cheques)
    const available = [];
    if (payments.stripe.enabled) available.push('Tarjeta (enlace seguro)');
    if (payments.transfer.enabled) available.push('Transferencia SPEI');
    if (payments.cash.enabled && (!payments.cash.allowedOnlyForPickup || deliveryMethod === 'pickup')) {
      available.push('Efectivo');
    }

    return {
      success: false,
      prompt: `No contamos con esa forma de pago. Las opciones habilitadas para tu pedido son: ${available.join(', ')}. ¿Cuál te gustaría utilizar?`,
      confirmationRequired: false,
      confirmationReason: 'unsupported_payment_choice',
      suggestedAction: 'select_payment',
    };
  }

  /**
   * Full conversational message processor for fulfillment inquiries and steps.
   */
  processFulfillmentMessage(
    userMessage: string,
    currentStep: OrderWorkflowStep,
    deliveryMethod?: DeliveryMethod | null,
    subtotal?: number,
  ): FulfillmentDialogueResponse {
    // Defense 1: Inbound card data interception
    const cardDefense = this.inspectInboundMessageForCardData(userMessage);
    if (cardDefense.containsCardData && cardDefense.warningPrompt) {
      return {
        success: false,
        prompt: cardDefense.warningPrompt,
        confirmationRequired: false,
        securityWarning: 'card_data_detected_and_redacted',
        sanitizedLogPayload: createFulfillmentLogEntry('card_leak_intercepted', 'system', {
          redactedLength: cardDefense.sanitizedText.length,
        }).data,
      };
    }

    const clean = cardDefense.sanitizedText.toLowerCase().trim();

    // Check delivery inquiries or selection
    if (currentStep === 'delivery' || clean.includes('envio') || clean.includes('envío') || clean.includes('recoleccion') || clean.includes('tienda') || clean.includes('showroom')) {
      if (clean.includes('tienda') || clean.includes('showroom') || clean.includes('recoleccion') || clean.includes('recolección') || clean.includes('pasar') || clean.includes('pickup')) {
        return this.getPickupDialogue();
      }
      return this.getShippingDialogue(subtotal);
    }

    // Check payment inquiries or selection
    if (currentStep === 'payment_choice' || clean.includes('pago') || clean.includes('pagar') || clean.includes('tarjeta') || clean.includes('transferencia') || clean.includes('efectivo')) {
      if (clean.includes('tarjeta') || clean.includes('transferencia') || clean.includes('efectivo') || clean.includes('spei')) {
        return this.evaluatePaymentSelection(clean, deliveryMethod);
      }
      return this.getPaymentMethodsDialogue(deliveryMethod);
    }

    // Fallback to general fulfillment status
    return {
      success: true,
      prompt: '¿Te gustaría consultar información sobre nuestros envíos o métodos de pago?',
      confirmationRequired: false,
    };
  }
}
