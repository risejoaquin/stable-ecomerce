import {
  type ConversationState,
  type ConversationDomainEvent,
  type CreateConversationParams,
  type ConversationIntent,
  type ConversationShippingLocation,
  ConversationStateSchema,
  ConversationIntentSchema,
  ConversationShippingLocationSchema,
  isConversationIntent,
} from '../../types/meta-commerce';

export class ConversationDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConversationDomainError';
  }
}

export class ConversationHandoffBlockedError extends ConversationDomainError {
  constructor(public readonly eventType: string, public readonly reason: string | null) {
    super(
      `Cannot apply event '${eventType}' because conversation is currently handed off to a human operator (reason: ${reason || 'unspecified'}).`,
    );
    this.name = 'ConversationHandoffBlockedError';
  }
}

export class InvalidConversationTransitionError extends ConversationDomainError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidConversationTransitionError';
  }
}

export interface CheckoutReadiness {
  canCheckout: boolean;
  missing: Array<'product' | 'quantity' | 'delivery_method' | 'payment_method' | 'shipping_location' | 'handoff_active'>;
  reasons: string[];
}

/**
 * Pure function: Creates an initial valid ConversationState.
 */
export function createConversationState(params: CreateConversationParams): ConversationState {
  if (!params.conversation_id || typeof params.conversation_id !== 'string' || !params.conversation_id.trim()) {
    throw new InvalidConversationTransitionError('conversation_id must be a non-empty string');
  }
  if (!params.external_user_id || typeof params.external_user_id !== 'string' || !params.external_user_id.trim()) {
    throw new InvalidConversationTransitionError('external_user_id must be a non-empty string');
  }

  const now = params.timestamp || new Date().toISOString();
  const initialIntent: ConversationIntent = params.initial_intent || 'greeting';

  const rawState: ConversationState = {
    conversation_id: params.conversation_id.trim(),
    channel: (params.channel && params.channel.trim()) || 'instagram',
    external_user_id: params.external_user_id.trim(),
    current_intent: initialIntent,
    current_product_id: null,
    current_variant_id: null,
    quantity: 1,
    cart_id: null,
    order_draft_id: null,
    delivery_method: null,
    payment_method: null,
    shipping_location: null,
    last_inbound_at: params.timestamp || null,
    last_outbound_at: null,
    handoff_required: false,
    handoff_reason: null,
    state_version: 1,
    metadata: params.metadata ? { ...params.metadata } : {},
    created_at: now,
    updated_at: now,
  };

  return ConversationStateSchema.parse(rawState);
}

/**
 * Pure function: Deep clones conversation state to ensure absolute immutability.
 */
export function cloneConversationState(state: ConversationState): ConversationState {
  return JSON.parse(JSON.stringify(state));
}

/**
 * Pure function: Validates an arbitrary object against the ConversationState schema.
 */
export function validateConversationState(input: unknown): ConversationState {
  return ConversationStateSchema.parse(input);
}

/**
 * Pure function: Safe parser for ConversationState.
 */
export function safeParseConversationState(input: unknown) {
  return ConversationStateSchema.safeParse(input);
}

/**
 * Pure function: Serializes ConversationState to deterministic JSON string.
 */
export function serializeConversationState(state: ConversationState): string {
  const validated = ConversationStateSchema.parse(state);
  return JSON.stringify(validated);
}

/**
 * Pure function: Deserializes JSON string to ConversationState with schema validation.
 */
export function deserializeConversationState(json: string): ConversationState {
  const parsed = JSON.parse(json);
  return ConversationStateSchema.parse(parsed);
}

/**
 * Pure query: Checks if the conversation is currently blocked by human handoff.
 */
export function isConversationHandoffActive(state: ConversationState): boolean {
  return Boolean(state.handoff_required);
}

/**
 * Pure query: Determines whether current conversation state satisfies all requirements
 * to proceed to order creation / checkout.
 */
export function canProceedToCheckout(state: ConversationState): CheckoutReadiness {
  const missing: CheckoutReadiness['missing'] = [];
  const reasons: string[] = [];

  if (state.handoff_required) {
    missing.push('handoff_active');
    reasons.push(`Conversation is in handoff state (reason: ${state.handoff_reason || 'unspecified'})`);
  }

  if (!state.current_product_id || !state.current_product_id.trim()) {
    missing.push('product');
    reasons.push('No product selected');
  }

  if (typeof state.quantity !== 'number' || !Number.isInteger(state.quantity) || state.quantity < 1) {
    missing.push('quantity');
    reasons.push('Quantity must be an integer >= 1');
  }

  if (!state.delivery_method || !state.delivery_method.trim()) {
    missing.push('delivery_method');
    reasons.push('Delivery method is required');
  }

  if (!state.payment_method || !state.payment_method.trim()) {
    missing.push('payment_method');
    reasons.push('Payment method is required');
  }

  if (!state.shipping_location) {
    missing.push('shipping_location');
    reasons.push('Shipping location is required');
  }

  return {
    canCheckout: missing.length === 0,
    missing,
    reasons,
  };
}

/**
 * Events allowed when human handoff is active.
 * Customer inbound messages and operator outbound messages are logged,
 * handoff can be resolved or escalated, or state reset. Commerce mutations remain blocked.
 */
const HANDOFF_PERMITTED_EVENTS = new Set<ConversationDomainEvent['type']>([
  'INBOUND_MESSAGE_RECEIVED',
  'OUTBOUND_MESSAGE_SENT',
  'HANDOFF_RESOLVED',
  'HANDOFF_TRIGGERED',
  'STATE_RESET',
]);

/**
 * Pure Reducer: Applies a domain event to an existing ConversationState,
 * producing a new immutable state with monotonically incremented state_version.
 */
export function reduceConversationState(
  state: ConversationState,
  event: ConversationDomainEvent,
): ConversationState {
  // Enforce handoff blocking invariant
  if (state.handoff_required && !HANDOFF_PERMITTED_EVENTS.has(event.type)) {
    throw new ConversationHandoffBlockedError(event.type, state.handoff_reason);
  }

  const now = event.timestamp || new Date().toISOString();
  const next: ConversationState = cloneConversationState(state);

  // Monotonic version increment
  next.state_version = state.state_version + 1;
  next.updated_at = now;

  switch (event.type) {
    case 'INBOUND_MESSAGE_RECEIVED': {
      next.last_inbound_at = event.timestamp || now;
      if (event.detectedIntent) {
        if (!isConversationIntent(event.detectedIntent)) {
          throw new InvalidConversationTransitionError(`Invalid detected intent: ${event.detectedIntent}`);
        }
        next.current_intent = event.detectedIntent;
      }
      break;
    }

    case 'OUTBOUND_MESSAGE_SENT': {
      next.last_outbound_at = event.timestamp || now;
      break;
    }

    case 'INTENT_IDENTIFIED': {
      if (!isConversationIntent(event.intent)) {
        throw new InvalidConversationTransitionError(`Invalid intent: ${event.intent}`);
      }
      next.current_intent = event.intent;
      break;
    }

    case 'PRODUCT_SELECTED': {
      next.current_product_id = event.productId;
      if (event.variantId !== undefined) {
        next.current_variant_id = event.variantId;
      } else {
        // Clear variant when selecting a new product without variant
        next.current_variant_id = null;
      }
      if (event.quantity !== undefined) {
        if (!Number.isInteger(event.quantity) || event.quantity < 1) {
          throw new InvalidConversationTransitionError('Quantity must be a positive integer >= 1');
        }
        next.quantity = event.quantity;
      }
      break;
    }

    case 'VARIANT_SELECTED': {
      next.current_variant_id = event.variantId;
      break;
    }

    case 'QUANTITY_SET': {
      if (!Number.isInteger(event.quantity) || event.quantity < 1) {
        throw new InvalidConversationTransitionError('Quantity must be a positive integer >= 1');
      }
      next.quantity = event.quantity;
      break;
    }

    case 'CART_ASSOCIATED': {
      next.cart_id = event.cartId;
      if (event.orderDraftId !== undefined) {
        next.order_draft_id = event.orderDraftId;
      }
      break;
    }

    case 'ORDER_DRAFT_CREATED': {
      next.order_draft_id = event.orderDraftId;
      // If cart_id is not yet set, link order_draft_id as the active commerce identifier
      if (!next.cart_id && event.orderDraftId) {
        next.cart_id = event.orderDraftId;
      }
      break;
    }

    case 'DELIVERY_METHOD_SELECTED': {
      next.delivery_method = event.deliveryMethod;
      break;
    }

    case 'PAYMENT_METHOD_SELECTED': {
      next.payment_method = event.paymentMethod;
      break;
    }

    case 'SHIPPING_LOCATION_UPDATED': {
      if (event.shippingLocation === null) {
        next.shipping_location = null;
      } else if (typeof event.shippingLocation === 'string') {
        next.shipping_location = ConversationShippingLocationSchema.parse({
          rawText: event.shippingLocation.trim(),
        });
      } else {
        next.shipping_location = ConversationShippingLocationSchema.parse(event.shippingLocation);
      }
      break;
    }

    case 'HANDOFF_TRIGGERED': {
      if (!event.reason || typeof event.reason !== 'string' || !event.reason.trim()) {
        throw new InvalidConversationTransitionError('Handoff reason must be a non-empty string');
      }
      next.handoff_required = true;
      next.handoff_reason = event.reason.trim();
      next.current_intent = 'human_help';
      break;
    }

    case 'HANDOFF_RESOLVED': {
      next.handoff_required = false;
      next.handoff_reason = null;
      if (event.resolutionNotes && next.metadata) {
        next.metadata.last_handoff_resolution = event.resolutionNotes;
      }
      break;
    }

    case 'STATE_RESET': {
      next.current_product_id = null;
      next.current_variant_id = null;
      next.quantity = 1;
      next.cart_id = null;
      next.order_draft_id = null;
      next.delivery_method = null;
      next.payment_method = null;
      next.shipping_location = null;
      next.handoff_required = false;
      next.handoff_reason = null;
      next.current_intent = 'greeting';
      if (!event.preserveCustomer) {
        next.metadata = {};
      }
      break;
    }

    default: {
      const exhaustiveCheck: never = event;
      throw new InvalidConversationTransitionError(`Unhandled event type: ${(exhaustiveCheck as any)?.type}`);
    }
  }

  return ConversationStateSchema.parse(next);
}

/**
 * Functional transition pipeline: applies a sequence of domain events sequentially.
 */
export function transitionConversation(
  initialState: ConversationState,
  events: ConversationDomainEvent[],
): ConversationState {
  return events.reduce((currentState, event) => reduceConversationState(currentState, event), initialState);
}
