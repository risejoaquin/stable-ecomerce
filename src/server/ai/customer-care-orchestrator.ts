import { createHash } from 'node:crypto';
import type { GoogleAiProvider, GoogleAiContent } from './google-provider-types.js';
import type { AiToolContext, AiToolExecutionResult, AiToolRegistryContract } from './tools/tool-types.js';
import { SYSTEM_POLICY, POLICY_VERSION, inspectCustomerText } from './assistant-policy.js';
import { InboundEnvelopeSchema, type ResponseDraft } from './channel-contracts.js';

export interface CareState {
  version: number; lastEventId: string; handoffRequired: boolean; draftOrderId?: string;
  selectedProductId?: string; selectedVariantName?: string; quantity?: number; cartId?: string;
  unitPrice?: number;
  deliveryMethod?: 'shipping' | 'pickup'; paymentMethod?: string; postalCode?: string;
}
export interface CareResult { draft: ResponseDraft; state: CareState; toolResults: AiToolExecutionResult[]; policyVersion: string }
const mutations = new Set(['create_cart', 'update_cart', 'create_order_draft', 'request_human_handoff']);
const safeText = 'No puedo confirmar esa informacion ahora. Podemos revisarla con un asesor.';

function render(name: string, data: any): string {
  switch (name) {
    case 'get_price': return `Precio verificado: ${data.unitPrice} ${data.currency}.`;
    case 'get_variant_stock': return `Disponibilidad verificada: ${data.inStock ? 'disponible' : 'agotado'}${data.availableQuantity === undefined ? '' : `; cantidad ${data.availableQuantity}`}.`;
    case 'get_product': return `Producto: ${data.product.name}. Precio: ${data.product.price} ${data.product.currency}.`;
    case 'search_products': return data.products.length ? data.products.map((p: any) => `${p.name}: ${p.price} ${p.currency}`).join('\n') : 'No encontramos productos con esa busqueda.';
    case 'create_cart': case 'update_cart': return `Carrito preparado: ${data.itemsCount} articulos; subtotal ${data.subtotal} ${data.currency}.`;
    case 'create_order_draft': return `Borrador ${data.draftOrderId} preparado, sin pagar. Total ${data.total} ${data.currency}. No es una confirmacion de pago.`;
    case 'get_order_status': return `Estado verificado del pedido: ${data.status}.`;
    case 'request_human_handoff': return 'Solicitud de asistencia registrada; queda pendiente de atencion humana.';
    case 'get_delivery_options': return 'Opciones de entrega consultadas; requiere seleccionar una opcion verificada.';
    case 'get_payment_options': return 'Opciones de pago consultadas. No compartas datos de tarjeta en este chat.';
    default: return safeText;
  }
}

/** Application owns tool execution and factual rendering; model prose is never trusted as commerce evidence. */
export class CustomerCareOrchestrator {
  readonly states = new Map<string, CareState>();
  private readonly events = new Map<string, { fingerprint: string; result: Promise<CareResult> }>();
  constructor(private provider: GoogleAiProvider, private registry: AiToolRegistryContract,
    private limits = { iterations: 3, timeoutMs: 5000 }) {
    if (!Number.isInteger(limits.iterations) || limits.iterations < 1 || limits.iterations > 5 ||
      !Number.isFinite(limits.timeoutMs) || limits.timeoutMs <= 0 || limits.timeoutMs > 30000) throw new Error('INVALID_LIMITS');
  }

  run(raw: unknown, context: AiToolContext, approvedMutations: readonly string[] = []): Promise<CareResult> {
    const inbound = InboundEnvelopeSchema.parse(raw);
    if (!context.isAuthenticated || !context.storeId || !context.userId || context.channel !== inbound.channel) {
      return Promise.reject(new Error('TRUSTED_CHANNEL_IDENTITY_REQUIRED'));
    }
    const scope = JSON.stringify([context.storeId, context.userId, inbound.channel, inbound.conversationId]);
    const key = JSON.stringify([scope, inbound.eventId]);
    const fingerprint = createHash('sha256').update(JSON.stringify([inbound, [...approvedMutations].sort()])).digest('hex');
    const previous = this.events.get(key);
    if (previous && previous.fingerprint !== fingerprint) return Promise.reject(new Error('EVENT_ID_CONFLICT'));
    if (previous) return previous.result.then(value => structuredClone(value));
    const result = Promise.resolve().then(() => this.process(inbound, context, scope, approvedMutations));
    this.events.set(key, { fingerprint, result });
    return result.then(value => structuredClone(value));
  }

  private async process(inbound: ReturnType<typeof InboundEnvelopeSchema.parse>, context: AiToolContext, scope: string,
    approvedMutations: readonly string[]): Promise<CareResult> {
    const state: CareState = { ...(this.states.get(scope) ?? { version: 0, lastEventId: '', handoffRequired: false }) };
    const lowerText = inbound.text.toLowerCase();
    let text = 'Que producto u opcion de RELIC te gustaria consultar?';
    const toolResults: AiToolExecutionResult[] = [];
    const decision = inspectCustomerText(inbound.text);
    if (decision === 'refuse') text = 'Solo puedo ayudar con productos y soporte RELIC. No compartas secretos ni credenciales.';
    if (decision === 'handoff') { state.handoffRequired = true; text = safeText; }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('CARE_TIMEOUT')); }, this.limits.timeoutMs);
    });
    const contents: GoogleAiContent[] = [{ role: 'user', parts: [{ text: inbound.text }] }];
    const loop = async () => {
      if (decision === 'handoff') {
        const result = await this.registry.executeTool('request_human_handoff', {
          reason: /devoluci[oó]n|refund|reembolso/i.test(inbound.text) ? 'return_request' : 'customer_requested',
          summary: 'Customer requested commercial support review.', priority: 'medium',
          idempotencyKey: createHash('sha256').update(JSON.stringify([scope, inbound.eventId, 'handoff'])).digest('hex'),
        }, context);
        toolResults.push(result);
        text = result.success ? render('request_human_handoff', result.data) : safeText;
        return;
      }
      if (decision !== 'continue' || state.handoffRequired) return;
      if (/\b(env[ií]o|enviar|domicilio)\b/.test(lowerText) && !context.postalCode && !state.postalCode) {
        text = 'Para consultar el envio necesito tu codigo postal.';
        return;
      }
      const wantsPurchase = /\b(quiero|agrega|anade|añade|aparta|comprar|llevo)\b/.test(lowerText);
      const explicitConfirmation = /\b(confirmo|confirmar|si,? adelante|procede)\b/.test(lowerText);
      for (let iteration = 0; iteration < this.limits.iterations; iteration++) {
        const answer = await this.provider.generate({ contents, systemInstruction: SYSTEM_POLICY,
          tools: this.registry.getGeminiTools(), toolConfig: { functionCallingConfig: { mode: 'AUTO' } } },
        { signal: controller.signal, timeoutMs: this.limits.timeoutMs, maxRetries: 0 });
        if (controller.signal.aborted) throw new Error('CARE_TIMEOUT');
        if (!answer.functionCalls?.length) return; // Unverified model prose is intentionally discarded.
        if (answer.functionCalls.length > 1) {
          if (answer.functionCalls.length > 5 || answer.functionCalls.some(call => mutations.has(call.name))) {
            throw new Error('MULTIPLE_ACTIONS_REQUIRE_CLARIFICATION');
          }
          const facts: string[] = [];
          for (const call of answer.functionCalls) {
            if (!this.registry.getTool(call.name)) throw new Error('UNREGISTERED_TOOL');
            const result = await this.registry.executeTool(call.name, call.args, context);
            if (controller.signal.aborted) throw new Error('CARE_TIMEOUT');
            toolResults.push(result);
            if (!result.success) throw new Error('TOOL_FAILED');
            const multiData = result.data as any;
            if (call.name === 'get_price' && typeof multiData?.unitPrice === 'number') state.unitPrice = multiData.unitPrice;
            facts.push(render(call.name, result.data));
          }
          text = facts.join('\n').slice(0, 1800);
          return;
        }
        const call = answer.functionCalls[0];
        if (!this.registry.getTool(call.name)) throw new Error('UNREGISTERED_TOOL');
        const autoApproved = (call.name === 'create_cart' || call.name === 'update_cart') && wantsPurchase && Boolean(state.selectedProductId || context.selectedProductId);
        const orderApproved = call.name === 'create_order_draft' && explicitConfirmation && Boolean(state.cartId || context.cartId) && Boolean(context.customerEmail);
        if (mutations.has(call.name) && !approvedMutations.includes(call.name) && !autoApproved && !orderApproved) throw new Error('APPLICATION_CONFIRMATION_REQUIRED');
        const args: Record<string, any> = { ...call.args };
        if (mutations.has(call.name)) {
          const businessKey = call.name === 'create_order_draft'
            ? (state.cartId ?? context.cartId ?? 'missing-cart')
            : inbound.eventId;
          args.idempotencyKey = createHash('sha256')
            .update(JSON.stringify([scope, businessKey, call.name, iteration])).digest('hex');
        }
        if (call.name === 'create_order_draft') {
          const cartId = state.cartId ?? context.cartId;
          if (!cartId || !context.customerEmail || !context.deliveryMethod || !context.paymentMethod) throw new Error('ORDER_CONTEXT_INCOMPLETE');
          if (state.unitPrice !== undefined && (state.selectedProductId ?? context.selectedProductId) && (state.selectedVariantName ?? context.selectedVariantName)) {
            const currentPrice = await this.registry.executeTool('get_price', {
              productId: state.selectedProductId ?? context.selectedProductId,
              variantName: state.selectedVariantName ?? context.selectedVariantName,
              quantity: state.quantity ?? 1,
            }, context);
            if (!currentPrice.success) throw new Error('PRICE_REVALIDATION_FAILED');
            const currentUnitPrice = Number((currentPrice.data as any)?.unitPrice);
            if (!Number.isFinite(currentUnitPrice)) throw new Error('PRICE_REVALIDATION_FAILED');
            if (currentUnitPrice !== state.unitPrice) {
              state.unitPrice = currentUnitPrice;
              text = `El precio actualizado es ${currentUnitPrice} MXN. Confirma nuevamente para continuar.`;
              return;
            }
          }
          args.cartId = cartId; args.customerEmail = context.customerEmail;
          args.customerName = context.customerName;
          args.shippingAddress = context.shippingAddress;
          args.deliveryMethod = context.deliveryMethod; args.paymentMethod = context.paymentMethod;
          args.customerConfirmed = true; delete args.items;
        }
        const result = await this.registry.executeTool(call.name, args, context);
        if (controller.signal.aborted) throw new Error('CARE_TIMEOUT');
        toolResults.push(result);
        if (!result.success) throw new Error('TOOL_FAILED');
        text = render(call.name, result.data).slice(0, 1800);
        const data = result.data as any;
        if (call.name === 'search_products' && data?.products?.length === 1) state.selectedProductId = data.products[0].id;
        if (call.name === 'get_product' && data?.product?.id) state.selectedProductId = data.product.id;
        if (call.name === 'get_variant_stock') { state.selectedProductId ??= context.selectedProductId; state.selectedVariantName ??= context.selectedVariantName; }
        if (call.name === 'get_price' && typeof data?.unitPrice === 'number') state.unitPrice = data.unitPrice;
        if ((call.name === 'create_cart' || call.name === 'update_cart') && data?.cartId) { state.cartId = data.cartId; state.quantity = data.itemsCount; }
        if (call.name === 'get_delivery_options') { state.deliveryMethod = context.deliveryMethod; state.postalCode = context.postalCode; }
        if (call.name === 'get_payment_options' && data?.methods?.length === 1) state.paymentMethod = data.methods[0].method;
        if (call.name === 'create_order_draft') state.draftOrderId = data?.draftOrderId;
        if (call.name === 'request_human_handoff') state.handoffRequired = true;
        // One successful tool fulfills this turn; a new user turn is needed for further mutations.
        return;
      }
      throw new Error('TOOL_ITERATION_LIMIT');
    };
    try { await Promise.race([loop(), deadline]); }
    catch { text = safeText; state.handoffRequired = true; }
    finally { clearTimeout(timer!); controller.abort(); }
    state.lastEventId = inbound.eventId; state.version++;
    this.states.set(scope, structuredClone(state));
    return { draft: { eventId: inbound.eventId, conversationId: inbound.conversationId,
      channel: inbound.channel, recipientId: inbound.externalUserId, text,
      handoffRequired: state.handoffRequired, status: 'DRAFT_ONLY', liveSend: false },
    state: structuredClone(state), toolResults, policyVersion: POLICY_VERSION };
  }
}
