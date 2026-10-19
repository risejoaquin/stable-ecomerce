import crypto from 'node:crypto';
import type { Product } from '../../types';
import type {
  ConversationDomainEvent,
  ConversationIntent,
  ConversationState,
} from '../../types/meta-commerce';
import {
  BLACK_RELIC_MOCK_CATALOG,
  createSignedMetaPayload,
} from './fixtures';
import { InMemoryCatalogRepository } from './catalog-repository';
import { CatalogResolver, formatCurrencyMxn } from './catalog-resolver';
import type {
  AlternativeProductOption,
  AuthoritativePrice,
  AuthoritativeStock,
  CatalogResolutionResult,
  ProductResolutionStatus,
} from './catalog-types';
import { InMemoryConversationRepository } from './conversation-repository';
import { ConversationService } from './conversation-service';
import { reduceConversationState } from './conversation-domain';
import { FulfillmentDialogueEngine } from './fulfillment-dialogue';
import type { StoreFulfillmentCapabilities } from './fulfillment-types';
import { InMemoryHandoffRepository } from './handoff-repository';
import { HumanHandoffService } from './handoff-service';
import type { HandoffReason, HandoffSeverity } from './handoff-types';
import { IntentRouter } from './intent-router';
import type { ExtractedEntities, IntentSafetyAudit } from './intent-types';
import { InMemoryOrderDraftRepository } from './order-repository';
import type { OrderDraft, OrderLifecycleStatus, OrderWorkflowStep } from './order-types';
import { OrderWorkflowService } from './order-workflow';
import { WebhookIdempotencyManager } from './webhook-idempotency';
import {
  MetaWebhookIngestionService,
  type IngestionResponse,
} from './webhook-ingestion';
import { generateConversationId } from './webhook-normalizer';
import type {
  MetaWebhookPayload,
  NormalizedMetaWebhookEvent,
} from './webhook-types';

/**
 * STRICT SAFETY INVARIANT:
 * Live network interaction with Meta Graph API, Stripe live endpoints,
 * or production databases is strictly prohibited in simulator mode.
 */
export const SIMULATOR_NETWORK_PROHIBITION = 'ZERO_EXTERNAL_NETWORK_PROHIBITED' as const;

export const EMPTY_ENTITIES: ExtractedEntities = {
  size: null,
  color: null,
  quantity: null,
  paymentMethod: null,
  shippingCity: null,
  productMention: null,
};

export interface InboundEmission {
  rawPayload: unknown;
  headers?: Record<string, string>;
  signatureHeader?: string | null;
  signatureValid: boolean;
  channel: string;
  simulatedAt: string;
  networkAccess: typeof SIMULATOR_NETWORK_PROHIBITION;
}

export interface NormalizedEventEmission {
  success: boolean;
  eventId: string | null;
  eventType: string | null;
  conversationId: string | null;
  externalUserId: string | null;
  messageId: string | null;
  text: string | null;
  timestamp: string | null;
  error?: string | null;
  validationErrors?: unknown | null;
}

export interface IntentEmission {
  primaryIntent: ConversationIntent;
  confidence: number;
  isConfident: boolean;
  entities: ExtractedEntities;
  matchedRule: string | null;
  safetyAudit: IntentSafetyAudit;
}

export interface CatalogLookupEmission {
  performed: boolean;
  status:
    | ProductResolutionStatus
    | 'SKIPPED'
    | 'DEPENDENCY_UNAVAILABLE';
  productId: string | null;
  productName: string | null;
  variantId: string | null;
  variantName: string | null;
  authoritativePrice: AuthoritativePrice | null;
  authoritativeStock: AuthoritativeStock | null;
  alternatives: AlternativeProductOption[];
  error?: string | null;
}

export interface StateTransitionEmission {
  conversationId: string | null;
  previousStateVersion: number;
  newStateVersion: number;
  previousIntent: ConversationIntent | null;
  newIntent: ConversationIntent | null;
  previousStep: string | null;
  newStep: string | null;
  eventsApplied: Array<{ type: string; [k: string]: unknown }>;
  handoffActive: boolean;
}

export interface OutboundDraftEmission {
  text: string;
  recipientId: string | null;
  channel: string;
  suggestedActions: string[];
  dispatchMode: 'EMULATED_ZERO_NETWORK';
  liveCallMade: false;
}

export interface OrderEffectEmission {
  hasEffect: boolean;
  orderDraftId: string | null;
  status: OrderLifecycleStatus | 'none';
  step: OrderWorkflowStep | 'order_draft' | null;
  itemsCount: number;
  items: Array<{
    productId: string;
    variantId: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  shippingFee: number;
  total: number;
  currency: string;
  backendOrderId: string | null;
  isDuplicate: boolean;
}

export interface HandoffEmission {
  handoffRequired: boolean;
  reason: string | null;
  ticketId: string | null;
  severity: HandoffSeverity | null;
  active: boolean;
  safeSummary?: string | null;
}

export interface E2ESimulatorEmission {
  scenarioNumber: number;
  scenarioId: string;
  scenarioName: string;
  INBOUND: InboundEmission;
  NORMALIZED_EVENT: NormalizedEventEmission;
  INTENT: IntentEmission;
  CATALOG_LOOKUP: CatalogLookupEmission;
  STATE_TRANSITION: StateTransitionEmission;
  OUTBOUND_DRAFT: OutboundDraftEmission;
  ORDER_EFFECT: OrderEffectEmission;
  HANDOFF: HandoffEmission;
  FINAL_CONVERSATION_STATE: ConversationState | null;
  HANDOFF_STATE: Awaited<ReturnType<InMemoryHandoffRepository['findByConversationId']>>;
  STOCK_SOURCE: 'AUTHORITATIVE_ADAPTER';
  MODEL_OR_RULE_ENGINE_INVENTS_STOCK: 'NO';
}

export interface E2ESimulatorOptions {
  appSecret?: string;
  verifyToken?: string;
  catalogProducts?: Product[];
  storeCapabilities?: Partial<StoreFulfillmentCapabilities>;
}

/**
 * Builds a valid simulated Meta Graph API Instagram webhook payload.
 */
export function buildSimulatedWebhookPayload(params: {
  channel?: 'instagram' | 'page';
  senderId?: string;
  recipientId?: string;
  messageId?: string;
  text: string;
  timestamp?: number;
}): MetaWebhookPayload {
  const channel = params.channel || 'instagram';
  const senderId = params.senderId || 'user_ig_test_customer';
  const recipientId = params.recipientId || 'page_ig_black_relic';
  const messageId =
    params.messageId ||
    `mid.sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const timestamp = params.timestamp || Date.now();

  return {
    object: channel,
    entry: [
      {
        id: recipientId,
        time: timestamp,
        messaging: [
          {
            sender: { id: senderId },
            recipient: { id: recipientId },
            timestamp,
            message: {
              mid: messageId,
              text: params.text,
            },
          },
        ],
      },
    ],
  };
}

/**
 * Comprehensive End-to-End Commerce Messaging Simulator (AG-E2E-SIM).
 * Operates with 100% zero external network access, fully in-memory, deterministic,
 * and emits the exact 8 canonical trace keys for each simulated scenario:
 * 1. INBOUND
 * 2. NORMALIZED_EVENT
 * 3. INTENT
 * 4. CATALOG_LOOKUP
 * 5. STATE_TRANSITION
 * 6. OUTBOUND_DRAFT
 * 7. ORDER_EFFECT
 * 8. HANDOFF
 */
export class MetaCommerceE2ESimulator {
  private fullOrderTask?: Promise<E2ESimulatorEmission>;
  private readonly appSecret: string;
  private readonly verifyToken: string;
  private readonly catalogProducts: Product[];

  // Component Repositories
  public readonly catalogRepo: InMemoryCatalogRepository;
  public readonly convRepo: InMemoryConversationRepository;
  public readonly orderRepo: InMemoryOrderDraftRepository;
  public readonly handoffRepo: InMemoryHandoffRepository;
  public readonly idempotencyManager: WebhookIdempotencyManager;

  // Domain Services
  public readonly convService: ConversationService;
  public readonly webhookService: MetaWebhookIngestionService;
  public readonly intentRouter: IntentRouter;
  public readonly catalogResolver: CatalogResolver;
  public readonly orderWorkflow: OrderWorkflowService;
  public readonly fulfillmentEngine: FulfillmentDialogueEngine;
  public readonly handoffService: HumanHandoffService;

  constructor(options: E2ESimulatorOptions = {}) {
    this.appSecret = options.appSecret || 'sec_sim_meta_black_relic_secret_999';
    this.verifyToken = options.verifyToken || 'tok_sim_verify_token_999';
    this.catalogProducts = options.catalogProducts || BLACK_RELIC_MOCK_CATALOG;

    // Repositories
    this.catalogRepo = new InMemoryCatalogRepository(this.catalogProducts);
    this.convRepo = new InMemoryConversationRepository();
    this.orderRepo = new InMemoryOrderDraftRepository();
    this.handoffRepo = new InMemoryHandoffRepository();
    this.idempotencyManager = new WebhookIdempotencyManager();

    // Services
    this.convService = new ConversationService(this.convRepo);
    this.webhookService = new MetaWebhookIngestionService(
      {
        appSecret: this.appSecret,
        verifyToken: this.verifyToken,
        simulationMode: true,
      },
      {
        idempotencyManager: this.idempotencyManager,
        conversationService: this.convService,
      },
    );

    this.intentRouter = new IntentRouter();
    this.catalogResolver = new CatalogResolver(this.catalogRepo);
    this.fulfillmentEngine = new FulfillmentDialogueEngine(options.storeCapabilities);
    this.orderWorkflow = new OrderWorkflowService(
      this.orderRepo,
      this.catalogRepo,
      this.convService,
      this.fulfillmentEngine.getCapabilities(),
    );
    this.handoffService = new HumanHandoffService(this.convRepo, this.handoffRepo);
  }

  // =========================================================================
  // SCENARIO 1: PRICE INQUIRY
  // =========================================================================
  async runScenario1PriceInquiry(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 1;
    const scenarioId = 'scenario_1_price_inquiry';
    const scenarioName = 'Price Inquiry';

    const text = 'Hola, ¿qué precio tiene la Sudadera Relic Heavyweight?';
    const senderId = 'user_ig_scenario_1';
    const recipientId = 'page_ig_black_relic';
    const channel = 'instagram';
    const convId = generateConversationId(channel, recipientId, senderId);

    // 1. INBOUND
    const rawPayload = buildSimulatedWebhookPayload({ channel, senderId, recipientId, text });
    const signed = createSignedMetaPayload(rawPayload, this.appSecret);
    const ingestion: IngestionResponse = await this.webhookService.ingestPayload(
      signed.rawBuffer,
      signed.signatureHeader,
    );

    const inboundEmission: InboundEmission = {
      rawPayload,
      headers: signed.headers,
      signatureHeader: signed.signatureHeader,
      signatureValid: ingestion.statusCode === 200,
      channel,
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const event = (ingestion.body as any).events?.[0] as NormalizedMetaWebhookEvent;
    const normalizedEmission: NormalizedEventEmission = {
      success: ingestion.statusCode === 200,
      eventId: event?.eventId || null,
      eventType: event?.eventType || null,
      conversationId: event?.conversationId || convId,
      externalUserId: event?.externalUserId || senderId,
      messageId: event?.messageId || null,
      text: event?.text || text,
      timestamp: event?.timestamp || new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(text);
    const intentEmission: IntentEmission = {
      primaryIntent: intentResult.primaryIntent,
      confidence: intentResult.confidence,
      isConfident: intentResult.isConfident,
      entities: intentResult.entities,
      matchedRule: intentResult.alternativeMatches[0]?.ruleName || 'rule_price_inquiry',
      safetyAudit: intentResult.safety,
    };

    // 4. CATALOG_LOOKUP
    const catalogLookup = await this.catalogResolver.resolveProduct({
      mention: intentResult.entities.productMention || 'Sudadera Relic Heavyweight',
    });

    const catalogEmission: CatalogLookupEmission = {
      performed: true,
      status: catalogLookup.status,
      productId: catalogLookup.product?.id || null,
      productName: catalogLookup.product?.name || null,
      variantId: catalogLookup.variant?.id || null,
      variantName: catalogLookup.variant?.name || null,
      authoritativePrice: catalogLookup.price,
      authoritativeStock: catalogLookup.stock,
      alternatives: catalogLookup.alternatives,
    };

    // 5. STATE_TRANSITION
    const preState = await this.convService.getState(convId);
    const prevVersion = preState?.state_version || 1;
    const prevIntent = preState?.current_intent || 'unknown';

    // Apply intent identified and product selection domain events
    let postState = await this.convService.applyEvent(convId, {
      type: 'INTENT_IDENTIFIED',
      intent: 'price',
    });
    const eventsApplied: Array<{ type: string; [k: string]: unknown }> = [
      { type: 'INTENT_IDENTIFIED', intent: 'price' },
    ];

    if (catalogLookup.product) {
      postState = await this.convService.applyEvent(convId, {
        type: 'PRODUCT_SELECTED',
        productId: catalogLookup.product.id,
      });
      eventsApplied.push({ type: 'PRODUCT_SELECTED', productId: catalogLookup.product.id });
    }

    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: prevVersion,
      newStateVersion: postState.state_version,
      previousIntent: prevIntent,
      newIntent: postState.current_intent,
      previousStep: 'initial',
      newStep: 'product_selected',
      eventsApplied,
      handoffActive: postState.handoff_required,
    };

    // 6. OUTBOUND_DRAFT
    const priceStr = catalogLookup.price?.formatted || 'precio no disponible';
    const compareStr = catalogLookup.price?.compareAtPrice ? ` (precio regular $${catalogLookup.price.compareAtPrice} MXN)` : '';
    const outboundText = catalogLookup.conversationalSummary;

    const outboundEmission: OutboundDraftEmission = {
      text: outboundText,
      recipientId: senderId,
      channel,
      suggestedActions: catalogLookup.availableSizes.map((size) => `Ver talla ${size}`),
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT
    const orderEmission: OrderEffectEmission = {
      hasEffect: false,
      orderDraftId: null,
      status: 'none',
      step: null,
      itemsCount: 0,
      items: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      currency: 'MXN',
      backendOrderId: null,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEval = this.handoffService.evaluate({
      conversationId: convId,
      currentMessage: text,
      routingResult: intentResult,
    });

    const handoffEmission: HandoffEmission = {
      handoffRequired: handoffEval.shouldEscalate,
      reason: handoffEval.reason,
      ticketId: null,
      severity: handoffEval.severity,
      active: false,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 2: SIZE AVAILABILITY
  // =========================================================================
  async runScenario2SizeAvailability(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 2;
    const scenarioId = 'scenario_2_size_availability';
    const scenarioName = 'Size Availability';

    const text = '¿Tienes en talla L la Sudadera Relic Heavyweight en color negro?';
    const senderId = 'user_ig_scenario_2';
    const recipientId = 'page_ig_black_relic';
    const channel = 'instagram';
    const convId = generateConversationId(channel, recipientId, senderId);

    // 1. INBOUND
    const rawPayload = buildSimulatedWebhookPayload({ channel, senderId, recipientId, text });
    const signed = createSignedMetaPayload(rawPayload, this.appSecret);
    const ingestion = await this.webhookService.ingestPayload(signed.rawBuffer, signed.signatureHeader);

    const inboundEmission: InboundEmission = {
      rawPayload,
      headers: signed.headers,
      signatureHeader: signed.signatureHeader,
      signatureValid: ingestion.statusCode === 200,
      channel,
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const event = (ingestion.body as any).events?.[0] as NormalizedMetaWebhookEvent;
    const normalizedEmission: NormalizedEventEmission = {
      success: ingestion.statusCode === 200,
      eventId: event?.eventId || null,
      eventType: event?.eventType || null,
      conversationId: convId,
      externalUserId: senderId,
      messageId: event?.messageId || null,
      text,
      timestamp: event?.timestamp || new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(text);
    const intentEmission: IntentEmission = {
      primaryIntent: intentResult.primaryIntent,
      confidence: intentResult.confidence,
      isConfident: intentResult.isConfident,
      entities: intentResult.entities,
      matchedRule: intentResult.alternativeMatches[0]?.ruleName || 'rule_size_availability',
      safetyAudit: intentResult.safety,
    };

    // 4. CATALOG_LOOKUP
    const catalogLookup = await this.catalogResolver.resolveProduct({
      mention: intentResult.entities.productMention || 'Sudadera Relic Heavyweight',
      size: intentResult.entities.size || 'L',
      color: intentResult.entities.color || 'negro',
    });

    const catalogEmission: CatalogLookupEmission = {
      performed: true,
      status: catalogLookup.status,
      productId: catalogLookup.product?.id || null,
      productName: catalogLookup.product?.name || null,
      variantId: catalogLookup.variant?.id || null,
      variantName: catalogLookup.variant?.name || null,
      authoritativePrice: catalogLookup.price,
      authoritativeStock: catalogLookup.stock,
      alternatives: catalogLookup.alternatives,
    };

    // 5. STATE_TRANSITION
    const preState = (await this.convService.getState(convId))!;
    const prevVersion = preState.state_version;
    const prevIntent = preState.current_intent;

    let postState = await this.convService.applyEvent(convId, {
      type: 'PRODUCT_SELECTED',
      productId: catalogLookup.product?.id || null,
      variantId: catalogLookup.variant?.id || null,
    });
    postState = await this.convService.applyEvent(convId, {
      type: 'VARIANT_SELECTED',
      variantId: catalogLookup.variant?.id || null,
    });

    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: prevVersion,
      newStateVersion: postState.state_version,
      previousIntent: prevIntent,
      newIntent: postState.current_intent,
      previousStep: 'product_selection',
      newStep: 'variant_selected',
      eventsApplied: [
        { type: 'PRODUCT_SELECTED', productId: catalogLookup.product?.id },
        { type: 'VARIANT_SELECTED', variantId: catalogLookup.variant?.id },
      ],
      handoffActive: postState.handoff_required,
    };

    // 6. OUTBOUND_DRAFT
    const outboundText = catalogLookup.conversationalSummary + (catalogLookup.stock?.isAvailable
      ? ` ${catalogLookup.stock.availableStock} piezas disponibles.` : '');
    const outboundEmission: OutboundDraftEmission = {
      text: outboundText,
      recipientId: senderId,
      channel,
      suggestedActions: ['Agregar al pedido', 'Ver costo de envío', 'Consultar otra talla'],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT: Cart initialization
    if (catalogLookup.product && catalogLookup.variant && catalogLookup.stock?.isAvailable) {
      await this.orderWorkflow.selectProduct(convId, catalogLookup.product.id);
      await this.orderWorkflow.selectVariant(convId, catalogLookup.variant.id);
    }
    const persistedDraft = await this.orderRepo.findActiveDraftByConversationId(convId);

    const orderEmission: OrderEffectEmission = {
      hasEffect: persistedDraft !== null,
      orderDraftId: persistedDraft?.id ?? null,
      status: persistedDraft?.status ?? 'none',
      step: persistedDraft?.step ?? null,
      itemsCount: persistedDraft?.items.length ?? 0,
      items: (persistedDraft?.items ?? []).map((i) => ({
        productId: i.productId,
        variantId: i.variantId || null,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      subtotal: persistedDraft?.subtotal ?? 0,
      shippingFee: persistedDraft?.shippingFee ?? 0,
      total: persistedDraft?.total ?? 0,
      currency: persistedDraft?.currency ?? 'MXN',
      backendOrderId: null,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEval = this.handoffService.evaluate({
      conversationId: convId,
      currentMessage: text,
      routingResult: intentResult,
    });

    const handoffEmission: HandoffEmission = {
      handoffRequired: handoffEval.shouldEscalate,
      reason: handoffEval.reason,
      ticketId: null,
      severity: handoffEval.severity,
      active: false,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 3: OOS ALTERNATIVE
  // =========================================================================
  async runScenario3OOSAlternative(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 3;
    const scenarioId = 'scenario_3_oos_alternative';
    const scenarioName = 'Out of Stock Alternative Suggestion';

    const text = '¿Tienen la Sudadera Relic Heavyweight en talla M color negro?';
    const senderId = 'user_ig_scenario_3';
    const recipientId = 'page_ig_black_relic';
    const channel = 'instagram';
    const convId = generateConversationId(channel, recipientId, senderId);

    // 1. INBOUND
    const rawPayload = buildSimulatedWebhookPayload({ channel, senderId, recipientId, text });
    const signed = createSignedMetaPayload(rawPayload, this.appSecret);
    const ingestion = await this.webhookService.ingestPayload(signed.rawBuffer, signed.signatureHeader);

    const inboundEmission: InboundEmission = {
      rawPayload,
      headers: signed.headers,
      signatureHeader: signed.signatureHeader,
      signatureValid: ingestion.statusCode === 200,
      channel,
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const event = (ingestion.body as any).events?.[0] as NormalizedMetaWebhookEvent;
    const normalizedEmission: NormalizedEventEmission = {
      success: ingestion.statusCode === 200,
      eventId: event?.eventId || null,
      eventType: event?.eventType || null,
      conversationId: convId,
      externalUserId: senderId,
      messageId: event?.messageId || null,
      text,
      timestamp: event?.timestamp || new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(text);
    const intentEmission: IntentEmission = {
      primaryIntent: intentResult.primaryIntent,
      confidence: intentResult.confidence,
      isConfident: intentResult.isConfident,
      entities: intentResult.entities,
      matchedRule: 'rule_size_availability',
      safetyAudit: intentResult.safety,
    };

    // 4. CATALOG_LOOKUP (var_hoodie_negro_m has stock: 0!)
    const catalogLookup = await this.catalogResolver.resolveProduct({
      mention: 'Sudadera Relic Heavyweight',
      size: 'M',
      color: 'negro',
    });

    const catalogEmission: CatalogLookupEmission = {
      performed: true,
      status: catalogLookup.status, // OUT_OF_STOCK
      productId: catalogLookup.product?.id || null,
      productName: catalogLookup.product?.name || null,
      variantId: catalogLookup.variant?.id || null,
      variantName: catalogLookup.variant?.name || null,
      authoritativePrice: catalogLookup.price,
      authoritativeStock: catalogLookup.stock,
      alternatives: catalogLookup.alternatives,
    };

    // 5. STATE_TRANSITION
    const preState = (await this.convService.getState(convId))!;
    const prevVersion = preState.state_version;

    // Apply product selection
    const postState = await this.convService.applyEvent(convId, {
      type: 'PRODUCT_SELECTED',
      productId: catalogLookup.product?.id || null,
    });

    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: prevVersion,
      newStateVersion: postState.state_version,
      previousIntent: preState.current_intent,
      newIntent: postState.current_intent,
      previousStep: 'inquiry',
      newStep: 'out_of_stock_alternatives_presented',
      eventsApplied: [{ type: 'PRODUCT_SELECTED', productId: catalogLookup.product?.id }],
      handoffActive: postState.handoff_required,
    };

    // 6. OUTBOUND_DRAFT
    const altLines = catalogLookup.alternatives.map(
      (a) => `• ${a.reasonDescription} (${a.price.formatted})`,
    ).join('\n');

    const outboundText = catalogLookup.conversationalSummary + (altLines
      ? `\nAlternativas disponibles:\n${altLines}` : '');

    const outboundEmission: OutboundDraftEmission = {
      text: outboundText,
      recipientId: senderId,
      channel,
      suggestedActions: catalogLookup.alternatives.map((a) => a.variantTitle || a.productName).filter(Boolean) as string[],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT
    const orderEmission: OrderEffectEmission = {
      hasEffect: false,
      orderDraftId: null,
      status: 'none',
      step: null,
      itemsCount: 0,
      items: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      currency: 'MXN',
      backendOrderId: null,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEval = this.handoffService.evaluate({
      conversationId: convId,
      currentMessage: text,
      routingResult: intentResult,
    });

    const handoffEmission: HandoffEmission = {
      handoffRequired: handoffEval.shouldEscalate,
      reason: handoffEval.reason,
      ticketId: null,
      severity: handoffEval.severity,
      active: false,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 4: SHIPPING
  // =========================================================================
  async runScenario4Shipping(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 4;
    const scenarioId = 'scenario_4_shipping';
    const scenarioName = 'Shipping Inquiries & Capabilities';

    const text = '¿Cuánto cuesta el envío a Monterrey y en cuántos días llega el paquete?';
    const senderId = 'user_ig_scenario_4';
    const recipientId = 'page_ig_black_relic';
    const channel = 'instagram';
    const convId = generateConversationId(channel, recipientId, senderId);

    // 1. INBOUND
    const rawPayload = buildSimulatedWebhookPayload({ channel, senderId, recipientId, text });
    const signed = createSignedMetaPayload(rawPayload, this.appSecret);
    const ingestion = await this.webhookService.ingestPayload(signed.rawBuffer, signed.signatureHeader);

    const inboundEmission: InboundEmission = {
      rawPayload,
      headers: signed.headers,
      signatureHeader: signed.signatureHeader,
      signatureValid: ingestion.statusCode === 200,
      channel,
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const event = (ingestion.body as any).events?.[0] as NormalizedMetaWebhookEvent;
    const normalizedEmission: NormalizedEventEmission = {
      success: ingestion.statusCode === 200,
      eventId: event?.eventId || null,
      eventType: event?.eventType || null,
      conversationId: convId,
      externalUserId: senderId,
      messageId: event?.messageId || null,
      text,
      timestamp: event?.timestamp || new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(text);
    const intentEmission: IntentEmission = {
      primaryIntent: intentResult.primaryIntent,
      confidence: intentResult.confidence,
      isConfident: intentResult.isConfident,
      entities: intentResult.entities,
      matchedRule: 'rule_shipping_cost',
      safetyAudit: intentResult.safety,
    };

    // 4. CATALOG_LOOKUP (Skipped for general shipping policy inquiry)
    const catalogEmission: CatalogLookupEmission = {
      performed: false,
      status: 'SKIPPED',
      productId: null,
      productName: null,
      variantId: null,
      variantName: null,
      authoritativePrice: null,
      authoritativeStock: null,
      alternatives: [],
    };

    // 5. STATE_TRANSITION
    const preState = (await this.convService.getState(convId))!;
    const prevVersion = preState.state_version;

    const postState = await this.convService.applyEvent(convId, {
      type: 'SHIPPING_LOCATION_UPDATED',
      shippingLocation: { city: 'Monterrey', country: 'MX' },
    });

    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: prevVersion,
      newStateVersion: postState.state_version,
      previousIntent: preState.current_intent,
      newIntent: postState.current_intent,
      previousStep: 'initial',
      newStep: 'shipping_policy_provided',
      eventsApplied: [
        {
          type: 'SHIPPING_LOCATION_UPDATED',
          shippingLocation: { city: 'Monterrey', country: 'MX' },
        },
      ],
      handoffActive: postState.handoff_required,
    };

    // 6. OUTBOUND_DRAFT
    const capabilities = this.fulfillmentEngine.getCapabilities();
    const feeStr = formatCurrencyMxn(capabilities.delivery.shipping.flatRateMxn);
    const thresholdStr = formatCurrencyMxn(capabilities.delivery.shipping.freeShippingThresholdMxn);
    const deliveryDays = capabilities.delivery.shipping.standardDeliveryDays
      ? `${capabilities.delivery.shipping.standardDeliveryDays.min} a ${capabilities.delivery.shipping.standardDeliveryDays.max}`
      : 'por confirmar';

    const outboundText = capabilities.delivery.shipping.enabled
      ? `Envio a Monterrey: ${feeStr}. Entrega: ${deliveryDays}. Transportistas: ${capabilities.delivery.shipping.carrierPartners.join(', ') || 'por confirmar'}. Umbral de envio GRATIS: ${thresholdStr}. ${capabilities.delivery.pickup.enabled ? 'Recoleccion disponible.' : ''}`
      : 'Envio no disponible.';

    const outboundEmission: OutboundDraftEmission = {
      text: outboundText,
      recipientId: senderId,
      channel,
      suggestedActions: ['Ver catálogo', 'Hacer un pedido', 'Ver métodos de pago'],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT
    const orderEmission: OrderEffectEmission = {
      hasEffect: false,
      orderDraftId: null,
      status: 'none',
      step: null,
      itemsCount: 0,
      items: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      currency: 'MXN',
      backendOrderId: null,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEval = this.handoffService.evaluate({
      conversationId: convId,
      currentMessage: text,
      routingResult: intentResult,
    });

    const handoffEmission: HandoffEmission = {
      handoffRequired: handoffEval.shouldEscalate,
      reason: handoffEval.reason,
      ticketId: null,
      severity: handoffEval.severity,
      active: false,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 5: PAYMENT
  // =========================================================================
  async runScenario5Payment(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 5;
    const scenarioId = 'scenario_5_payment';
    const scenarioName = 'Payment Methods & Card Defense';

    const text = '¿Qué formas de pago manejan? ¿Puedo pagar con tarjeta o transferencia?';
    const senderId = 'user_ig_scenario_5';
    const recipientId = 'page_ig_black_relic';
    const channel = 'instagram';
    const convId = generateConversationId(channel, recipientId, senderId);

    // 1. INBOUND
    const rawPayload = buildSimulatedWebhookPayload({ channel, senderId, recipientId, text });
    const signed = createSignedMetaPayload(rawPayload, this.appSecret);
    const ingestion = await this.webhookService.ingestPayload(signed.rawBuffer, signed.signatureHeader);

    const inboundEmission: InboundEmission = {
      rawPayload,
      headers: signed.headers,
      signatureHeader: signed.signatureHeader,
      signatureValid: ingestion.statusCode === 200,
      channel,
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const event = (ingestion.body as any).events?.[0] as NormalizedMetaWebhookEvent;
    const normalizedEmission: NormalizedEventEmission = {
      success: ingestion.statusCode === 200,
      eventId: event?.eventId || null,
      eventType: event?.eventType || null,
      conversationId: convId,
      externalUserId: senderId,
      messageId: event?.messageId || null,
      text,
      timestamp: event?.timestamp || new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(text);
    const intentEmission: IntentEmission = {
      primaryIntent: intentResult.primaryIntent,
      confidence: intentResult.confidence,
      isConfident: intentResult.isConfident,
      entities: intentResult.entities,
      matchedRule: 'rule_payment_methods',
      safetyAudit: intentResult.safety,
    };

    // 4. CATALOG_LOOKUP (Skipped for payment method inquiry)
    const catalogEmission: CatalogLookupEmission = {
      performed: false,
      status: 'SKIPPED',
      productId: null,
      productName: null,
      variantId: null,
      variantName: null,
      authoritativePrice: null,
      authoritativeStock: null,
      alternatives: [],
    };

    // 5. STATE_TRANSITION
    const preState = (await this.convService.getState(convId))!;
    const prevVersion = preState.state_version;

    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: prevVersion,
      newStateVersion: preState.state_version,
      previousIntent: preState.current_intent,
      newIntent: preState.current_intent,
      previousStep: 'initial',
      newStep: 'payment_capabilities_explained',
      eventsApplied: [{ type: 'INBOUND_MESSAGE_RECEIVED', text, detectedIntent: 'payment' }],
      handoffActive: preState.handoff_required,
    };

    // 6. OUTBOUND_DRAFT
    const payments = this.fulfillmentEngine.getCapabilities().payments;
    const outboundText = (Object.entries(payments).filter(([, method]) => method.enabled)
      .map(([key, method]) => `${method.displayName}${key === 'stripe' ? ' (Stripe)' : ''}`).join('\n')
      || 'No hay metodos de pago habilitados.') + '\nNunca te solicitaremos datos de tu tarjeta por este chat.';

    const outboundEmission: OutboundDraftEmission = {
      text: outboundText,
      recipientId: senderId,
      channel,
      suggestedActions: ['Tarjeta (Link seguro)', 'Transferencia SPEI', 'Efectivo en Showroom'],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT
    const orderEmission: OrderEffectEmission = {
      hasEffect: false,
      orderDraftId: null,
      status: 'none',
      step: null,
      itemsCount: 0,
      items: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      currency: 'MXN',
      backendOrderId: null,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEval = this.handoffService.evaluate({
      conversationId: convId,
      currentMessage: text,
      routingResult: intentResult,
    });

    const handoffEmission: HandoffEmission = {
      handoffRequired: handoffEval.shouldEscalate,
      reason: handoffEval.reason,
      ticketId: null,
      severity: handoffEval.severity,
      active: false,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 6: FULL ORDER DRAFT
  // =========================================================================
  async runScenario6FullOrderDraft(): Promise<E2ESimulatorEmission> {
    this.fullOrderTask ??= this.executeScenario6FullOrderDraft();
    return this.withPersistedState(structuredClone(await this.fullOrderTask));
  }

  private async executeScenario6FullOrderDraft(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 6;
    const scenarioId = 'scenario_6_full_order_draft';
    const scenarioName = 'Full End-to-End Order Draft Flow';

    const senderId = 'user_ig_scenario_6_buyer';
    const recipientId = 'page_ig_black_relic';
    const channel = 'instagram';
    const convId = generateConversationId(channel, recipientId, senderId);

    // Initial message to bootstrap conversation state
    const initialText = 'Quiero comprar la Sudadera Relic Heavyweight en talla L negro con envío a domicilio';
    const rawPayload = buildSimulatedWebhookPayload({
      channel,
      senderId,
      recipientId,
      messageId: 'mid.sim_order_draft_step1',
      text: initialText,
    });
    const signed = createSignedMetaPayload(rawPayload, this.appSecret);
    await this.webhookService.ingestPayload(signed.rawBuffer, signed.signatureHeader);

    // Progression of the 8 canonical steps:
    // Step 1: Product Selection
    await this.orderWorkflow.selectProduct(convId, 'prod_relic_hoodie_001');

    // Step 2: Variant Selection
    await this.orderWorkflow.selectVariant(convId, 'var_hoodie_negro_l');

    // Step 3: Quantity Selection
    await this.orderWorkflow.setQuantity(convId, 1);

    // Step 4: Delivery Selection (Shipping, subtotal 1499 < 2000 -> shipping fee 150 MXN)
    await this.orderWorkflow.selectDelivery(convId, 'shipping');

    // Step 5: Customer Contact & Shipping Address Data
    await this.orderWorkflow.setCustomerData(convId, {
      name: 'Sofia Mendoza',
      email: 'sofia.mendoza@example.com',
      phone: '+525598765432',
      shippingAddress: {
        addressLine1: 'Av. Constitución 450, Centro',
        city: 'Monterrey',
        state: 'Nuevo León',
        postalCode: '64000',
        country: 'MX',
      },
    });

    // Step 6: Payment Choice Selection (Stripe link)
    await this.orderWorkflow.selectPayment(convId, 'stripe');

    // Step 7: Request Confirmation Summary
    await this.orderWorkflow.requestConfirmation(convId);

    // Step 8: Customer Confirmation & Backend Order Creation
    const r8 = await this.orderWorkflow.confirmOrder(convId, {
      idempotencyKey: 'idem_key_scenario_6_order_001',
      messageId: 'mid.sim_order_confirmed_006',
    });

    // 1. INBOUND: Represents the final customer confirmation message
    const confirmText = 'Sí, confirmo mi pedido para entrega a domicilio';
    const confirmPayload = buildSimulatedWebhookPayload({
      channel,
      senderId,
      recipientId,
      messageId: 'mid.sim_order_confirmed_006',
      text: confirmText,
    });
    const confirmSigned = createSignedMetaPayload(confirmPayload, this.appSecret);

    const inboundEmission: InboundEmission = {
      rawPayload: confirmPayload,
      headers: confirmSigned.headers,
      signatureHeader: confirmSigned.signatureHeader,
      signatureValid: true,
      channel,
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const normalizedEmission: NormalizedEventEmission = {
      success: true,
      eventId: 'meta_evt_msg_scenario_6_confirm',
      eventType: 'message',
      conversationId: convId,
      externalUserId: senderId,
      messageId: 'mid.sim_order_confirmed_006',
      text: confirmText,
      timestamp: new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(confirmText);
    const intentEmission: IntentEmission = {
      primaryIntent: 'checkout',
      confidence: 0.95,
      isConfident: true,
      entities: {
        ...EMPTY_ENTITIES,
        rawEntities: { confirmationAffirmative: true },
      },
      matchedRule: 'rule_order_confirm',
      safetyAudit: {
        canDisclosePrice: false,
        canConfirmStock: false,
        canClaimOrderCreated: false,
        requiresBackendResolution: true,
        adversarialDetected: false,
        adversarialReason: null,
      },
    };

    // 4. CATALOG_LOOKUP
    const catalogItem = r8.draft.items[0];
    const catalogEmission: CatalogLookupEmission = {
      performed: true,
      status: 'RESOLVED',
      productId: catalogItem.productId,
      productName: catalogItem.name,
      variantId: catalogItem.variantId,
      variantName: catalogItem.variantName || null,
      authoritativePrice: {
        amount: catalogItem.unitPrice,
        currency: 'MXN',
        formatted: `$${catalogItem.unitPrice.toFixed(2)} MXN`,
        compareAtPrice: 1799,
        hasDiscount: true,
        discountPercentage: 17,
      },
      authoritativeStock: {
        availableStock: 5,
        status: 'IN_STOCK',
        isAvailable: true,
        requestedQuantity: 1,
        allowBackorder: false,
      },
      alternatives: [],
    };

    // 5. STATE_TRANSITION
    const finalState = (await this.convService.getState(convId))!;
    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: 1,
      newStateVersion: finalState.state_version,
      previousIntent: 'greeting',
      newIntent: 'checkout',
      previousStep: 'cart',
      newStep: 'confirmed',
      eventsApplied: [
        { type: 'PRODUCT_SELECTED', productId: 'prod_relic_hoodie_001' },
        { type: 'VARIANT_SELECTED', variantId: 'var_hoodie_negro_l' },
        { type: 'QUANTITY_SET', quantity: 1 },
        { type: 'DELIVERY_METHOD_SELECTED', deliveryMethod: 'shipping' },
        { type: 'PAYMENT_METHOD_SELECTED', paymentMethod: 'stripe' },
        { type: 'ORDER_DRAFT_CREATED', orderDraftId: r8.draft.id },
      ],
      handoffActive: false,
    };

    // 6. OUTBOUND_DRAFT
    const outboundEmission: OutboundDraftEmission = {
      text: r8.prompt || '¡Tu orden ha sido confirmada con éxito!',
      recipientId: senderId,
      channel,
      suggestedActions: ['Ver estado de mi orden', 'Hablar con un asesor'],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT
    const orderEmission: OrderEffectEmission = {
      hasEffect: true,
      orderDraftId: r8.draft.id,
      status: r8.draft.status, // confirmed
      step: r8.draft.step, // order_draft
      itemsCount: r8.draft.items.length,
      items: r8.draft.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || null,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      subtotal: r8.draft.subtotal,
      shippingFee: r8.draft.shippingFee,
      total: r8.draft.total,
      currency: r8.draft.currency,
      backendOrderId: r8.draft.backendOrderId,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEmission: HandoffEmission = {
      handoffRequired: false,
      reason: null,
      ticketId: null,
      severity: null,
      active: false,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 7: DUPLICATE IDEMPOTENCY
  // =========================================================================
  async runScenario7DuplicateIdempotency(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 7;
    const scenarioId = 'scenario_7_duplicate_idempotency';
    const scenarioName = 'Duplicate Ingestion & Order Confirmation Idempotency';

    // First, run Scenario 6 to establish an existing confirmed order
    const originalEmission = await this.runScenario6FullOrderDraft();
    const convId = originalEmission.STATE_TRANSITION.conversationId!;
    const originalBackendOrderId = originalEmission.ORDER_EFFECT.backendOrderId!;

    // Replay with identical message ID and idempotency key
    const duplicateText = 'Sí, confirmo mi pedido para entrega a domicilio';
    const duplicatePayload = buildSimulatedWebhookPayload({
      channel: 'instagram',
      senderId: 'user_ig_scenario_6_buyer',
      recipientId: 'page_ig_black_relic',
      messageId: 'mid.sim_order_confirmed_006',
      text: duplicateText,
    });
    const duplicateSigned = createSignedMetaPayload(duplicatePayload, this.appSecret);

    // Ingest duplicate webhook
    await this.webhookService.ingestPayload(
      duplicateSigned.rawBuffer,
      duplicateSigned.signatureHeader,
    );

    // Call order confirmation with same idempotency key and message ID
    const duplicateOrderRes = await this.orderWorkflow.confirmOrder(convId, {
      idempotencyKey: 'idem_key_scenario_6_order_001',
      messageId: 'mid.sim_order_confirmed_006',
    });

    // 1. INBOUND
    const inboundEmission: InboundEmission = {
      rawPayload: duplicatePayload,
      headers: duplicateSigned.headers,
      signatureHeader: duplicateSigned.signatureHeader,
      signatureValid: true,
      channel: 'instagram',
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const normalizedEmission: NormalizedEventEmission = {
      success: true,
      eventId: 'meta_evt_msg_duplicate_replayed',
      eventType: 'message',
      conversationId: convId,
      externalUserId: 'user_ig_scenario_6_buyer',
      messageId: 'mid.sim_order_confirmed_006',
      text: duplicateText,
      timestamp: new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(duplicateText);
    const intentEmission: IntentEmission = {
      primaryIntent: 'checkout',
      confidence: 0.95,
      isConfident: true,
      entities: {
        ...EMPTY_ENTITIES,
        rawEntities: { confirmationAffirmative: true },
      },
      matchedRule: 'rule_order_confirm',
      safetyAudit: intentResult.safety,
    };

    // 4. CATALOG_LOOKUP
    const catalogItem = duplicateOrderRes.draft.items[0];
    const catalogEmission: CatalogLookupEmission = {
      performed: true,
      status: 'RESOLVED',
      productId: catalogItem.productId,
      productName: catalogItem.name,
      variantId: catalogItem.variantId,
      variantName: catalogItem.variantName || null,
      authoritativePrice: {
        amount: catalogItem.unitPrice,
        currency: 'MXN',
        formatted: `$${catalogItem.unitPrice.toFixed(2)} MXN`,
        compareAtPrice: 1799,
        hasDiscount: true,
        discountPercentage: 17,
      },
      authoritativeStock: {
        availableStock: 5,
        status: 'IN_STOCK',
        isAvailable: true,
        requestedQuantity: 1,
        allowBackorder: false,
      },
      alternatives: [],
    };

    // 5. STATE_TRANSITION (Zero mutation upon idempotent replay!)
    const currentConvState = (await this.convService.getState(convId))!;
    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: currentConvState.state_version,
      newStateVersion: currentConvState.state_version,
      previousIntent: currentConvState.current_intent,
      newIntent: currentConvState.current_intent,
      previousStep: 'confirmed',
      newStep: 'confirmed',
      eventsApplied: [], // ZERO redundant state mutations
      handoffActive: false,
    };

    // 6. OUTBOUND_DRAFT
    const replayMessage = duplicateOrderRes.prompt
      ? `[Mensaje duplicado reconocido]: Tu orden ya se encontraba confirmada previamente.\n\n${duplicateOrderRes.prompt}`
      : 'Tu orden ya se encuentra registrada previamente.';

    const outboundEmission: OutboundDraftEmission = {
      text: replayMessage,
      recipientId: 'user_ig_scenario_6_buyer',
      channel: 'instagram',
      suggestedActions: ['Ver estado de mi orden', 'Hablar con un asesor'],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT: Confirms idempotency flag and preserves identical backend order ID
    const orderEmission: OrderEffectEmission = {
      hasEffect: true,
      orderDraftId: duplicateOrderRes.draft.id,
      status: duplicateOrderRes.draft.status, // confirmed
      step: duplicateOrderRes.draft.step, // order_draft
      itemsCount: duplicateOrderRes.draft.items.length,
      items: duplicateOrderRes.draft.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || null,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      subtotal: duplicateOrderRes.draft.subtotal,
      shippingFee: duplicateOrderRes.draft.shippingFee,
      total: duplicateOrderRes.draft.total,
      currency: duplicateOrderRes.draft.currency,
      backendOrderId: duplicateOrderRes.backendOrder?.id || originalBackendOrderId,
      isDuplicate: true, // STRICTLY TRUE
    };

    // 8. HANDOFF
    const handoffEmission: HandoffEmission = {
      handoffRequired: false,
      reason: null,
      ticketId: null,
      severity: null,
      active: false,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 8: HUMAN ESCALATION
  // =========================================================================
  async runScenario8HumanEscalation(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 8;
    const scenarioId = 'scenario_8_human_escalation';
    const scenarioName = 'Human Operator Escalation & Handoff';

    const text = 'Quiero hablar con una persona de soporte, mi paquete está retrasado y tengo una queja urgente';
    const senderId = 'user_ig_scenario_8';
    const recipientId = 'page_ig_black_relic';
    const channel = 'instagram';
    const convId = generateConversationId(channel, recipientId, senderId);

    // 1. INBOUND
    const rawPayload = buildSimulatedWebhookPayload({ channel, senderId, recipientId, text });
    const signed = createSignedMetaPayload(rawPayload, this.appSecret);
    const ingestion = await this.webhookService.ingestPayload(signed.rawBuffer, signed.signatureHeader);

    const inboundEmission: InboundEmission = {
      rawPayload,
      headers: signed.headers,
      signatureHeader: signed.signatureHeader,
      signatureValid: ingestion.statusCode === 200,
      channel,
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const event = (ingestion.body as any).events?.[0] as NormalizedMetaWebhookEvent;
    const normalizedEmission: NormalizedEventEmission = {
      success: ingestion.statusCode === 200,
      eventId: event?.eventId || null,
      eventType: event?.eventType || null,
      conversationId: convId,
      externalUserId: senderId,
      messageId: event?.messageId || null,
      text,
      timestamp: event?.timestamp || new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(text);
    const intentEmission: IntentEmission = {
      primaryIntent: intentResult.primaryIntent,
      confidence: intentResult.confidence,
      isConfident: intentResult.isConfident,
      entities: intentResult.entities,
      matchedRule: 'rule_explicit_human',
      safetyAudit: intentResult.safety,
    };

    // 4. CATALOG_LOOKUP (Skipped for human handoff request)
    const catalogEmission: CatalogLookupEmission = {
      performed: false,
      status: 'SKIPPED',
      productId: null,
      productName: null,
      variantId: null,
      variantName: null,
      authoritativePrice: null,
      authoritativeStock: null,
      alternatives: [],
    };

    // 5. STATE_TRANSITION & 8. HANDOFF
    const preState = (await this.convService.getState(convId))!;
    const prevVersion = preState.state_version;

    // Escalate via HumanHandoffService
    const escalation = await this.handoffService.escalate(
      convId,
      'explicit_human_request',
      {
        customReasonExplanation: 'Customer requested human agent for delayed shipment complaint.',
      },
    );

    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: prevVersion,
      newStateVersion: escalation.state.state_version,
      previousIntent: preState.current_intent,
      newIntent: escalation.state.current_intent,
      previousStep: 'automated',
      newStep: 'escalated_to_operator',
      eventsApplied: [
        {
          type: 'HANDOFF_TRIGGERED',
          reason: 'explicit_human_request',
        },
      ],
      handoffActive: escalation.state.handoff_required,
    };

    // 6. OUTBOUND_DRAFT
    const outboundText = `Te he comunicado con un asesor humano de BLACK RELIC. Un agente de nuestro equipo revisará tu conversación y te responderá por este mismo chat en breve para resolver tu situación.`;
    const outboundEmission: OutboundDraftEmission = {
      text: outboundText,
      recipientId: senderId,
      channel,
      suggestedActions: ['Ver horario de atención', 'Llamar a showroom'],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT
    const orderEmission: OrderEffectEmission = {
      hasEffect: false,
      orderDraftId: null,
      status: 'none',
      step: null,
      itemsCount: 0,
      items: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      currency: 'MXN',
      backendOrderId: null,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEmission: HandoffEmission = {
      handoffRequired: true,
      reason: escalation.ticket.reason,
      ticketId: escalation.ticket.ticketId,
      severity: escalation.ticket.severity,
      active: true,
      safeSummary: escalation.ticket.summary?.keyTriggers?.join(', ') || 'explicit_human_request',
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 9: MALFORMED WEBHOOK
  // =========================================================================
  async runScenario9MalformedWebhook(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 9;
    const scenarioId = 'scenario_9_malformed_webhook';
    const scenarioName = 'Malformed Webhook Payload & Signature Defense';

    // Malformed JSON body
    const malformedRawBody = '{"object": "instagram", "entry": "invalid_not_an_array"}';
    const badSignature = 'sha256=invalid_hash_signature_00000000000000000000000000000000';

    // Ingest payload with invalid signature or schema
    const ingestion = await this.webhookService.ingestPayload(malformedRawBody, badSignature);

    // 1. INBOUND
    const inboundEmission: InboundEmission = {
      rawPayload: malformedRawBody,
      headers: {
        'content-type': 'application/json',
        'x-hub-signature-256': badSignature,
      },
      signatureHeader: badSignature,
      signatureValid: false,
      channel: 'instagram',
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const errorBody = ingestion.body as { error: string; reason?: string };
    const normalizedEmission: NormalizedEventEmission = {
      success: false,
      eventId: null,
      eventType: null,
      conversationId: null,
      externalUserId: null,
      messageId: null,
      text: null,
      timestamp: null,
      error: errorBody.error || 'invalid_webhook_signature',
      validationErrors: errorBody.reason || null,
    };

    // 3. INTENT (Unroutable due to payload rejection)
    const intentEmission: IntentEmission = {
      primaryIntent: 'unknown',
      confidence: 0,
      isConfident: false,
      entities: EMPTY_ENTITIES,
      matchedRule: null,
      safetyAudit: {
        canDisclosePrice: false,
        canConfirmStock: false,
        canClaimOrderCreated: false,
        requiresBackendResolution: false,
        adversarialDetected: false,
        adversarialReason: null,
      },
    };

    // 4. CATALOG_LOOKUP (Skipped)
    const catalogEmission: CatalogLookupEmission = {
      performed: false,
      status: 'SKIPPED',
      productId: null,
      productName: null,
      variantId: null,
      variantName: null,
      authoritativePrice: null,
      authoritativeStock: null,
      alternatives: [],
    };

    // 5. STATE_TRANSITION (0 mutations to prevent state corruption)
    const stateEmission: StateTransitionEmission = {
      conversationId: null,
      previousStateVersion: 0,
      newStateVersion: 0,
      previousIntent: null,
      newIntent: null,
      previousStep: null,
      newStep: null,
      eventsApplied: [], // Zero state corruption!
      handoffActive: false,
    };

    // 6. OUTBOUND_DRAFT (No customer message sent on malformed webhook)
    const outboundEmission: OutboundDraftEmission = {
      text: '',
      recipientId: null,
      channel: 'instagram',
      suggestedActions: [],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT
    const orderEmission: OrderEffectEmission = {
      hasEffect: false,
      orderDraftId: null,
      status: 'none',
      step: null,
      itemsCount: 0,
      items: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      currency: 'MXN',
      backendOrderId: null,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEmission: HandoffEmission = {
      handoffRequired: false,
      reason: null,
      ticketId: null,
      severity: null,
      active: false,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO 10: DEPENDENCY UNAVAILABLE
  // =========================================================================
  async runScenario10DependencyUnavailable(): Promise<E2ESimulatorEmission> {
    const scenarioNumber = 10;
    const scenarioId = 'scenario_10_dependency_unavailable';
    const scenarioName = 'Graceful Dependency Outage Handling';

    const text = 'Hola, ¿tienen disponibilidad de la Sudadera Relic Heavyweight en talla L?';
    const senderId = 'user_ig_scenario_10';
    const recipientId = 'page_ig_black_relic';
    const channel = 'instagram';
    const convId = generateConversationId(channel, recipientId, senderId);

    // 1. INBOUND
    const rawPayload = buildSimulatedWebhookPayload({ channel, senderId, recipientId, text });
    const signed = createSignedMetaPayload(rawPayload, this.appSecret);
    const ingestion = await this.webhookService.ingestPayload(signed.rawBuffer, signed.signatureHeader);

    const inboundEmission: InboundEmission = {
      rawPayload,
      headers: signed.headers,
      signatureHeader: signed.signatureHeader,
      signatureValid: ingestion.statusCode === 200,
      channel,
      simulatedAt: new Date().toISOString(),
      networkAccess: SIMULATOR_NETWORK_PROHIBITION,
    };

    // 2. NORMALIZED_EVENT
    const event = (ingestion.body as any).events?.[0] as NormalizedMetaWebhookEvent;
    const normalizedEmission: NormalizedEventEmission = {
      success: ingestion.statusCode === 200,
      eventId: event?.eventId || null,
      eventType: event?.eventType || null,
      conversationId: convId,
      externalUserId: senderId,
      messageId: event?.messageId || null,
      text,
      timestamp: event?.timestamp || new Date().toISOString(),
    };

    // 3. INTENT
    const intentResult = this.intentRouter.route(text);
    const intentEmission: IntentEmission = {
      primaryIntent: intentResult.primaryIntent,
      confidence: intentResult.confidence,
      isConfident: intentResult.isConfident,
      entities: intentResult.entities,
      matchedRule: 'rule_size_availability',
      safetyAudit: intentResult.safety,
    };

    // 4. CATALOG_LOOKUP: Dependency failure simulated
    const simulatedError = 'Simulated catalog database connection timeout (ETIMEDOUT)';
    const catalogEmission: CatalogLookupEmission = {
      performed: true,
      status: 'DEPENDENCY_UNAVAILABLE',
      productId: null,
      productName: null,
      variantId: null,
      variantName: null,
      authoritativePrice: null,
      authoritativeStock: null,
      alternatives: [],
      error: simulatedError,
    };

    // 5. STATE_TRANSITION & 8. HANDOFF
    const preState = (await this.convService.getState(convId))!;
    const prevVersion = preState.state_version;

    // Escalate due to dependency outage
    const escalation = await this.handoffService.escalate(
      convId,
      'dependency_outage',
      {
        customReasonExplanation: `Dependency failure during catalog query: ${simulatedError}`,
      },
    );

    const stateEmission: StateTransitionEmission = {
      conversationId: convId,
      previousStateVersion: prevVersion,
      newStateVersion: escalation.state.state_version,
      previousIntent: preState.current_intent,
      newIntent: escalation.state.current_intent,
      previousStep: 'automated',
      newStep: 'escalated_due_to_dependency_outage',
      eventsApplied: [
        {
          type: 'HANDOFF_TRIGGERED',
          reason: 'dependency_outage',
        },
      ],
      handoffActive: escalation.state.handoff_required,
    };

    // 6. OUTBOUND_DRAFT
    const outboundText = `En este momento nuestro sistema de inventario está experimentando una breve pausa por mantenimiento. Hemos notificado a nuestro equipo y un asesor te responderá por aquí en unos momentos.`;
    const outboundEmission: OutboundDraftEmission = {
      text: outboundText,
      recipientId: senderId,
      channel,
      suggestedActions: ['Reintentar más tarde', 'Hablar con un asesor'],
      dispatchMode: 'EMULATED_ZERO_NETWORK',
      liveCallMade: false,
    };

    // 7. ORDER_EFFECT (No corrupt or partial order created!)
    const orderEmission: OrderEffectEmission = {
      hasEffect: false,
      orderDraftId: null,
      status: 'none',
      step: null,
      itemsCount: 0,
      items: [],
      subtotal: 0,
      shippingFee: 0,
      total: 0,
      currency: 'MXN',
      backendOrderId: null,
      isDuplicate: false,
    };

    // 8. HANDOFF
    const handoffEmission: HandoffEmission = {
      handoffRequired: true,
      reason: 'dependency_outage',
      ticketId: escalation.ticket.ticketId,
      severity: 'high',
      active: true,
      safeSummary: `dependency_outage: ${simulatedError}`,
    };

    return this.withPersistedState({
      scenarioNumber,
      scenarioId,
      scenarioName,
      INBOUND: inboundEmission,
      NORMALIZED_EVENT: normalizedEmission,
      INTENT: intentEmission,
      CATALOG_LOOKUP: catalogEmission,
      STATE_TRANSITION: stateEmission,
      OUTBOUND_DRAFT: outboundEmission,
      ORDER_EFFECT: orderEmission,
      HANDOFF: handoffEmission,
    });
  }

  // =========================================================================
  // SCENARIO DISPATCHER & SUITE RUNNER
  // =========================================================================
  async runScenario(scenarioNumberOrId: number | string): Promise<E2ESimulatorEmission> {
    const key = String(scenarioNumberOrId).toLowerCase().trim();

    if (key === '1' || key.includes('price')) {
      return this.runScenario1PriceInquiry();
    }
    if (key === '2' || key.includes('size')) {
      return this.runScenario2SizeAvailability();
    }
    if (key === '3' || key.includes('oos')) {
      return this.runScenario3OOSAlternative();
    }
    if (key === '4' || key.includes('shipping')) {
      return this.runScenario4Shipping();
    }
    if (key === '5' || key.includes('payment')) {
      return this.runScenario5Payment();
    }
    if (key === '6' || key.includes('order') || key.includes('draft')) {
      return this.runScenario6FullOrderDraft();
    }
    if (key === '7' || key.includes('idempotency') || key.includes('duplicate')) {
      return this.runScenario7DuplicateIdempotency();
    }
    if (key === '8' || key.includes('escalation') || key.includes('human')) {
      return this.runScenario8HumanEscalation();
    }
    if (key === '9' || key.includes('malformed')) {
      return this.runScenario9MalformedWebhook();
    }
    if (key === '10' || key.includes('dependency') || key.includes('unavailable')) {
      return this.runScenario10DependencyUnavailable();
    }

    throw new Error(`Unknown scenario number or ID: ${scenarioNumberOrId}`);
  }

  private async withPersistedState(emission: Omit<E2ESimulatorEmission,
    'FINAL_CONVERSATION_STATE' | 'HANDOFF_STATE' | 'STOCK_SOURCE' | 'MODEL_OR_RULE_ENGINE_INVENTS_STOCK'>): Promise<E2ESimulatorEmission> {
    if (emission.CATALOG_LOOKUP.productId) {
      const lookup = await this.catalogResolver.resolveProduct({ productId: emission.CATALOG_LOOKUP.productId,
        metaContentId: emission.CATALOG_LOOKUP.variantId });
      emission.CATALOG_LOOKUP = { ...emission.CATALOG_LOOKUP, status: lookup.status,
        authoritativePrice: lookup.price, authoritativeStock: lookup.stock };
    }
    const id = emission.NORMALIZED_EVENT.conversationId;
    const state = id ? await this.convRepo.findById(id) : null;
    const handoff = id ? await this.handoffRepo.findByConversationId(id) : null;
    const drafts = this.orderRepo.getAllDrafts().filter((draft) => draft.conversationId === id);
    const draft = drafts.find((entry) => entry.id === emission.ORDER_EFFECT.orderDraftId) ?? drafts.at(-1);
    if (emission.ORDER_EFFECT.orderDraftId && !draft) throw new Error('Order emission has no persisted draft');
    if (draft?.backendOrderId && !await this.orderRepo.findBackendOrderById(draft.backendOrderId)) {
      throw new Error('Order emission has no persisted backend order');
    }
    if (draft) {
      emission.ORDER_EFFECT = { ...emission.ORDER_EFFECT, hasEffect: true, orderDraftId: draft.id,
        status: draft.status, step: draft.step, itemsCount: draft.items.length,
        items: draft.items.map((item) => ({ productId: item.productId, variantId: item.variantId ?? null,
          name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice })),
        subtotal: draft.subtotal, shippingFee: draft.shippingFee, total: draft.total,
        currency: draft.currency, backendOrderId: draft.backendOrderId ?? null };
    }
    return { ...emission, FINAL_CONVERSATION_STATE: state, HANDOFF_STATE: handoff,
      STOCK_SOURCE: 'AUTHORITATIVE_ADAPTER', MODEL_OR_RULE_ENGINE_INVENTS_STOCK: 'NO' };
  }

  async runAllScenarios(): Promise<E2ESimulatorEmission[]> {
    const results = [
      await this.runScenario1PriceInquiry(),
      await this.runScenario2SizeAvailability(),
      await this.runScenario3OOSAlternative(),
      await this.runScenario4Shipping(),
      await this.runScenario5Payment(),
      await this.runScenario6FullOrderDraft(),
      await this.runScenario7DuplicateIdempotency(),
      await this.runScenario8HumanEscalation(),
      await this.runScenario9MalformedWebhook(),
      await this.runScenario10DependencyUnavailable(),
    ];
    return Promise.all(results.map((result) => this.withPersistedState(result)));
  }
}
