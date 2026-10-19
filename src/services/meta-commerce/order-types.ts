import { z } from 'zod';
import type { Product, ProductVariant } from '../../types';
import {
  ConversationShippingLocationSchema,
  type ConversationShippingLocation,
} from '../../types/meta-commerce';
import { ISO_CURRENCY_MXN } from './catalog-types';

export { ISO_CURRENCY_MXN, ConversationShippingLocationSchema, type ConversationShippingLocation };

/**
 * The 8 canonical sequence steps of the Meta Commerce order workflow.
 * STRICT SEQUENCE:
 * product → variant → quantity → delivery → customer data → payment choice → confirmation → order draft
 */
export const ORDER_WORKFLOW_STEPS = [
  'product',
  'variant',
  'quantity',
  'delivery',
  'customer_data',
  'payment_choice',
  'confirmation',
  'order_draft',
] as const;

export const OrderWorkflowStepSchema = z.enum(ORDER_WORKFLOW_STEPS);
export type OrderWorkflowStep = z.infer<typeof OrderWorkflowStepSchema>;

/**
 * Clear distinction across the order lifecycle:
 * - cart: customer is actively choosing items and quantities.
 * - draft: all fulfillment details and pricing snapshot are frozen, awaiting confirmation.
 * - confirmed: customer confirmed and backend order creation succeeded.
 * - cancelled: cart or draft was explicitly cancelled.
 */
export const OrderLifecycleStatusSchema = z.enum([
  'cart',
  'draft',
  'confirmed',
  'cancelled',
]);
export type OrderLifecycleStatus = z.infer<typeof OrderLifecycleStatusSchema>;

/**
 * Supported delivery methods for BLACK RELIC / Selfcare Sinners.
 */
export const DeliveryMethodSchema = z.enum([
  'shipping', // Envío a domicilio nacional / local
  'pickup',   // Recolección en tienda / showroom
]);
export type DeliveryMethod = z.infer<typeof DeliveryMethodSchema>;

/**
 * Supported payment choices.
 * STRICT INVARIANT: NO REAL PAYMENT CAPTURE IN DM.
 * - stripe: card link / secure checkout session URL generated; no card numbers in chat.
 * - transfer: SPEI bank transfer instructions generated; pending confirmation.
 * - cash: Cash on pickup / delivery; pending store receipt.
 */
export const PaymentChoiceSchema = z.enum([
  'stripe',
  'transfer',
  'cash',
]);
export type PaymentChoice = z.infer<typeof PaymentChoiceSchema>;

/**
 * Customer information required for order fulfillment.
 */
export const CustomerInfoSchema = z.object({
  name: z.string().trim().min(1, 'El nombre del cliente es obligatorio'),
  email: z.string().trim().email('Se requiere un correo electrónico válido'),
  phone: z.string().trim().optional().nullable(),
  shippingAddress: ConversationShippingLocationSchema.optional().nullable(),
});
export type CustomerInfo = z.infer<typeof CustomerInfoSchema>;

/**
 * Snapshot of a product attached to an order item.
 * Preserves the exact backend order item contract required by server.ts.
 */
export const ProductSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseName: z.string(),
  variantName: z.string().nullable().optional(),
  price: z.number().finite().nonnegative(),
  sku: z.string().nullable().optional(),
  images: z.array(z.string()).default([]),
});
export type ProductSnapshot = z.infer<typeof ProductSnapshotSchema>;

/**
 * Order item representation within the draft / cart.
 */
export const OrderDraftItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  name: z.string().min(1),
  variantName: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().finite().nonnegative(),
  totalPrice: z.number().finite().nonnegative(),
  images: z.array(z.string()).default([]),
  productSnapshot: ProductSnapshotSchema,
  requiresVariant: z.boolean().default(false),
});
export type OrderDraftItem = z.infer<typeof OrderDraftItemSchema>;

/**
 * Order draft domain entity.
 */
export const OrderDraftSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  externalUserId: z.string().min(1),
  channel: z.string().default('instagram'),
  storeId: z.string().min(1),
  step: OrderWorkflowStepSchema,
  status: OrderLifecycleStatusSchema,
  items: z.array(OrderDraftItemSchema),
  deliveryMethod: DeliveryMethodSchema.nullable().optional(),
  shippingAddress: ConversationShippingLocationSchema.nullable().optional(),
  customer: CustomerInfoSchema.nullable().optional(),
  paymentMethod: PaymentChoiceSchema.nullable().optional(),
  subtotal: z.number().finite().nonnegative(),
  shippingFee: z.number().finite().nonnegative(),
  discountAmount: z.number().finite().nonnegative(),
  couponCode: z.string().nullable().optional(),
  total: z.number().finite().nonnegative(),
  currency: z.literal(ISO_CURRENCY_MXN).default(ISO_CURRENCY_MXN),
  customerConfirmed: z.boolean().default(false),
  confirmedAt: z.string().nullable().optional(),
  backendOrderId: z.string().nullable().optional(),
  lastMessageId: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type OrderDraft = z.infer<typeof OrderDraftSchema>;

/**
 * Contract preserved for backend order creation in `orders` and `order_items` tables.
 * Must strictly match server.ts expectations.
 */
export interface BackendOrderItemPayload {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_snapshot: ProductSnapshot;
}

export interface BackendOrderPayload {
  store_id: string;
  customer_user_id: string | null;
  customer_email: string | null;
  status: 'pendiente';
  subtotal: number;
  total: number;
  currency: 'mxn';
  coupon_code: string | null;
  discount_amount: number;
  delivery_method?: string | null;
  payment_method?: string | null;
  shipping_address?: unknown;
  metadata?: Record<string, unknown>;
  order_items: BackendOrderItemPayload[];
}

export interface BackendOrderContract extends BackendOrderPayload {
  id: string;
  created_at: string;
}

/**
 * Result returned by order workflow operations.
 */
export interface OrderWorkflowResult {
  success: boolean;
  step: OrderWorkflowStep;
  status: OrderLifecycleStatus;
  draft: OrderDraft;
  backendOrder: BackendOrderContract | null;
  prompt: string;
  missingStep: OrderWorkflowStep | null;
  isDuplicate: boolean;
  error?: string;
}

/**
 * Pricing policy constants for Mexican e-commerce.
 */
export const DEFAULT_SHIPPING_FEE_MXN = 150;
export const FREE_SHIPPING_THRESHOLD_MXN = 2000;
