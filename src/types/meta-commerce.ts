import { z } from 'zod';

/**
 * Supported conversation channels for Meta Commerce Messaging.
 */
export const ConversationChannelSchema = z.enum([
  'instagram',
  'whatsapp',
  'messenger',
]).or(z.string().min(1));
export type ConversationChannel = z.infer<typeof ConversationChannelSchema>;

/**
 * 14 canonical conversation intents required for automated Instagram DM commerce.
 */
export const ConversationIntentSchema = z.enum([
  'greeting',
  'product_info',
  'price',
  'availability',
  'size',
  'color',
  'shipping',
  'payment',
  'add_to_cart',
  'checkout',
  'order_status',
  'return_exchange',
  'human_help',
  'unknown',
]);
export type ConversationIntent = z.infer<typeof ConversationIntentSchema>;

export const CONVERSATION_INTENTS: readonly ConversationIntent[] = ConversationIntentSchema.options;

export function isConversationIntent(value: unknown): value is ConversationIntent {
  return typeof value === 'string' && (CONVERSATION_INTENTS as readonly string[]).includes(value);
}

/**
 * Structured shipping location information gathered during conversation.
 */
export const ConversationShippingLocationSchema = z.object({
  addressLine1: z.string().trim().optional(),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().optional(),
  postalCode: z.string().trim().optional(),
  country: z.string().trim().default('MX').optional(),
  recipientName: z.string().trim().optional(),
  recipientPhone: z.string().trim().optional(),
  rawText: z.string().trim().optional(),
});
export type ConversationShippingLocation = z.infer<typeof ConversationShippingLocationSchema>;

/**
 * Standard escalation handoff reasons.
 */
export const ConversationHandoffReasonSchema = z.enum([
  'explicit_human_request',
  'repeated_low_confidence',
  'dispute',
  'refund_exchange_exception',
  'payment_issue',
  'unsupported_request',
  'safety_abuse',
  'dependency_outage',
  'operator_intervention',
]).or(z.string().min(1));
export type ConversationHandoffReason = z.infer<typeof ConversationHandoffReasonSchema>;

/**
 * Core conversation domain state schema containing all 16 required attributes.
 */
export const ConversationStateSchema = z.object({
  // 1. conversation_id
  conversation_id: z.string().min(1, 'conversation_id is required'),
  // 2. channel
  channel: z.string().min(1, 'channel is required').default('instagram'),
  // 3. external_user_id
  external_user_id: z.string().min(1, 'external_user_id is required'),
  // 4. current_intent
  current_intent: ConversationIntentSchema,
  // 5. current_product_id
  current_product_id: z.string().nullable(),
  // 6. current_variant_id
  current_variant_id: z.string().nullable(),
  // 7. quantity
  quantity: z.number().int().min(1, 'quantity must be at least 1').default(1),
  // 8. cart_id / order_draft_id
  cart_id: z.string().nullable(),
  order_draft_id: z.string().nullable(),
  // 9. delivery_method
  delivery_method: z.string().nullable(),
  // 10. payment_method
  payment_method: z.string().nullable(),
  // 11. shipping_location
  shipping_location: ConversationShippingLocationSchema.nullable(),
  // 12. last_inbound_at
  last_inbound_at: z.string().nullable(),
  // 13. last_outbound_at
  last_outbound_at: z.string().nullable(),
  // 14. handoff_required
  handoff_required: z.boolean().default(false),
  // 15. handoff_reason
  handoff_reason: z.string().nullable(),
  // 16. state_version
  state_version: z.number().int().min(1, 'state_version must be >= 1').default(1),

  // Operational metadata & timestamps
  metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type ConversationState = z.infer<typeof ConversationStateSchema>;

/**
 * Parameters to initialize a new conversation state.
 */
export interface CreateConversationParams {
  conversation_id: string;
  external_user_id: string;
  channel?: string;
  initial_intent?: ConversationIntent;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Domain events that trigger deterministic state transitions.
 */
export type ConversationDomainEvent =
  | {
      type: 'INBOUND_MESSAGE_RECEIVED';
      messageId?: string;
      text?: string;
      detectedIntent?: ConversationIntent;
      timestamp?: string;
    }
  | {
      type: 'OUTBOUND_MESSAGE_SENT';
      messageId?: string;
      timestamp?: string;
    }
  | {
      type: 'INTENT_IDENTIFIED';
      intent: ConversationIntent;
      timestamp?: string;
    }
  | {
      type: 'PRODUCT_SELECTED';
      productId: string | null;
      variantId?: string | null;
      quantity?: number;
      timestamp?: string;
    }
  | {
      type: 'VARIANT_SELECTED';
      variantId: string | null;
      timestamp?: string;
    }
  | {
      type: 'QUANTITY_SET';
      quantity: number;
      timestamp?: string;
    }
  | {
      type: 'CART_ASSOCIATED';
      cartId: string | null;
      orderDraftId?: string | null;
      timestamp?: string;
    }
  | {
      type: 'ORDER_DRAFT_CREATED';
      orderDraftId: string | null;
      timestamp?: string;
    }
  | {
      type: 'DELIVERY_METHOD_SELECTED';
      deliveryMethod: string | null;
      timestamp?: string;
    }
  | {
      type: 'PAYMENT_METHOD_SELECTED';
      paymentMethod: string | null;
      timestamp?: string;
    }
  | {
      type: 'SHIPPING_LOCATION_UPDATED';
      shippingLocation: ConversationShippingLocation | string | null;
      timestamp?: string;
    }
  | {
      type: 'HANDOFF_TRIGGERED';
      reason: string;
      timestamp?: string;
    }
  | {
      type: 'HANDOFF_RESOLVED';
      resolutionNotes?: string;
      timestamp?: string;
    }
  | {
      type: 'STATE_RESET';
      preserveCustomer?: boolean;
      timestamp?: string;
    };

export * from '../services/meta-commerce/webhook-types';
