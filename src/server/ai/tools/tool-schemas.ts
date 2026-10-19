/**
 * Google AI Customer Care - Restricted Tool Schemas
 *
 * Strongly-typed Zod schemas for all 11 allowed commerce tools.
 * Enforces validation boundaries, idempotency keys, and explicit output schemas.
 */

import { z } from 'zod';

// ============================================================================
// 1. search_products
// ============================================================================
export const SearchProductsInputSchema = z.strictObject({
  query: z.string().min(1, 'Search query cannot be empty').max(100, 'Search query too long').describe('Search query keyword or product name'),
  category: z.string().max(50).optional().describe('Optional category filter'),
  minPrice: z.number().nonnegative().optional().describe('Minimum price threshold'),
  maxPrice: z.number().nonnegative().optional().describe('Maximum price threshold'),
  limit: z.number().int().min(1).max(50).default(10).describe('Maximum number of items to return (1-50, default 10)'),
});
export type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;

export const SearchProductsItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional(),
  price: z.number(),
  currency: z.string().default('MXN'),
  inStock: z.boolean(),
  category: z.string().optional(),
  description: z.string().optional(),
});

export const SearchProductsOutputSchema = z.object({
  products: z.array(SearchProductsItemSchema),
  totalCount: z.number().int().nonnegative(),
  query: z.string(),
});
export type SearchProductsOutput = z.infer<typeof SearchProductsOutputSchema>;

// ============================================================================
// 2. get_product
// ============================================================================
export const GetProductInputSchema = z.strictObject({
  productId: z.string().min(1, 'Product ID or slug is required').describe('Unique product UUID or slug'),
});
export type GetProductInput = z.infer<typeof GetProductInputSchema>;

export const ProductVariantDetailSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  sku: z.string().optional().nullable(),
  price: z.number().optional().nullable(),
  stock: z.number(),
  inStock: z.boolean().optional(),
});

export const GetProductOutputSchema = z.object({
  product: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string().optional(),
    description: z.string().optional(),
    price: z.number(),
    compareAtPrice: z.number().optional().nullable(),
    currency: z.string().default('MXN'),
    stock: z.number(),
    inStock: z.boolean(),
    status: z.string(),
    variants: z.array(ProductVariantDetailSchema).optional(),
    images: z.array(z.string()).optional(),
  }),
});
export type GetProductOutput = z.infer<typeof GetProductOutputSchema>;

// ============================================================================
// 3. get_variant_stock
// ============================================================================
export const GetVariantStockInputSchema = z.strictObject({
  productId: z.string().min(1, 'Product ID is required').describe('Unique product ID'),
  variantName: z.string().optional().describe('Variant name (e.g., Size, Color)'),
  sku: z.string().optional().describe('Variant SKU if known'),
});
export type GetVariantStockInput = z.infer<typeof GetVariantStockInputSchema>;

export const GetVariantStockOutputSchema = z.object({
  productId: z.string(),
  variantName: z.string().optional(),
  sku: z.string().optional(),
  inStock: z.boolean(),
  stockLevel: z.enum(['out_of_stock', 'low_stock', 'in_stock']),
  availableQuantity: z.number().int().nonnegative().optional(),
  message: z.string(),
});
export type GetVariantStockOutput = z.infer<typeof GetVariantStockOutputSchema>;

// ============================================================================
// 4. get_price
// ============================================================================
export const GetPriceInputSchema = z.strictObject({
  productId: z.string().min(1, 'Product ID is required').describe('Unique product ID'),
  variantName: z.string().optional().describe('Specific variant name'),
  quantity: z.number().int().positive().default(1).describe('Quantity desired (default 1)'),
  couponCode: z.string().max(50).optional().describe('Optional promo or coupon code'),
});
export type GetPriceInput = z.infer<typeof GetPriceInputSchema>;

export const GetPriceOutputSchema = z.object({
  productId: z.string(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  subtotal: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  finalTotal: z.number().nonnegative(),
  currency: z.string().default('MXN'),
  couponApplied: z.boolean(),
  couponNote: z.string().optional(),
});
export type GetPriceOutput = z.infer<typeof GetPriceOutputSchema>;

// ============================================================================
// 5. get_delivery_options
// ============================================================================
export const GetDeliveryOptionsInputSchema = z.strictObject({
  postalCode: z.string().min(3).max(10).describe('Destination postal/ZIP code'),
  city: z.string().optional().describe('Destination city'),
  country: z.string().default('MX').describe('ISO country code (default MX)'),
});
export type GetDeliveryOptionsInput = z.infer<typeof GetDeliveryOptionsInputSchema>;

export const DeliveryOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  estimatedDays: z.string(),
  cost: z.number().nonnegative(),
  currency: z.string().default('MXN'),
  freeThreshold: z.number().optional(),
});

export const GetDeliveryOptionsOutputSchema = z.object({
  destination: z.object({
    postalCode: z.string(),
    city: z.string().optional(),
    country: z.string(),
  }),
  options: z.array(DeliveryOptionSchema),
});
export type GetDeliveryOptionsOutput = z.infer<typeof GetDeliveryOptionsOutputSchema>;

// ============================================================================
// 6. get_payment_options
// ============================================================================
export const GetPaymentOptionsInputSchema = z.strictObject({
  currency: z.string().default('MXN').describe('Transaction currency (default MXN)'),
  amount: z.number().nonnegative().optional().describe('Estimated order amount'),
});
export type GetPaymentOptionsInput = z.infer<typeof GetPaymentOptionsInputSchema>;

export const PaymentMethodOptionSchema = z.object({
  method: z.string(),
  name: z.string(),
  description: z.string(),
  supported: z.boolean(),
  secureRedirectOnly: z.boolean(),
});

export const GetPaymentOptionsOutputSchema = z.object({
  currency: z.string(),
  methods: z.array(PaymentMethodOptionSchema),
  paymentCaptureSupportedByAi: z.literal(false).describe('AI never captures payments directly'),
  securityNotice: z.string(),
});
export type GetPaymentOptionsOutput = z.infer<typeof GetPaymentOptionsOutputSchema>;

// ============================================================================
// 7. create_cart (Mutating - Idempotency Required)
// ============================================================================
export const CartItemInputSchema = z.strictObject({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().positive().max(99, 'Quantity cannot exceed 99'),
  variantName: z.string().optional(),
});

export const CreateCartInputSchema = z.strictObject({
  items: z.array(CartItemInputSchema).min(1, 'Cart must contain at least 1 item').max(50, 'Max 50 items'),
  customerEmail: z.string().email('Invalid email address').optional().describe('Optional customer email to associate cart'),
  idempotencyKey: z.string().min(8, 'idempotencyKey must be at least 8 characters').max(128).describe('Unique client-generated idempotency key'),
});
export type CreateCartInput = z.infer<typeof CreateCartInputSchema>;

export const CreateCartOutputSchema = z.object({
  cartId: z.string(),
  itemsCount: z.number().int().nonnegative(),
  subtotal: z.number().nonnegative(),
  currency: z.string().default('MXN'),
  createdAt: z.string(),
});
export type CreateCartOutput = z.infer<typeof CreateCartOutputSchema>;

// ============================================================================
// 8. update_cart (Mutating - Idempotency Required)
// ============================================================================
export const UpdateCartInputSchema = z.object({
  cartId: z.string().min(1, 'Cart ID is required'),
  action: z.enum(['add_item', 'remove_item', 'update_quantity', 'clear']).describe('Cart modification action'),
  item: CartItemInputSchema.optional().describe('Item payload for add_item, remove_item, or update_quantity'),
  idempotencyKey: z.string().min(8, 'idempotencyKey must be at least 8 characters').max(128).describe('Unique client-generated idempotency key'),
}).strict().refine(input => input.action === 'clear' ? !input.item : !!input.item, 'Item must match action');
export type UpdateCartInput = z.infer<typeof UpdateCartInputSchema>;

export const UpdateCartOutputSchema = z.object({
  cartId: z.string(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().nonnegative(),
    name: z.string().optional(),
    unitPrice: z.number().optional(),
  })),
  itemsCount: z.number().int().nonnegative(),
  subtotal: z.number().nonnegative(),
  currency: z.string().default('MXN'),
  updatedAt: z.string(),
});
export type UpdateCartOutput = z.infer<typeof UpdateCartOutputSchema>;

// ============================================================================
// 9. create_order_draft (Mutating - Draft Only, No Payment Capture)
// ============================================================================
export const ShippingAddressSchema = z.strictObject({
  street: z.string().optional(),
  postalCode: z.string().min(3).max(10),
  city: z.string().min(1),
  state: z.string().optional(),
  country: z.string().default('MX'),
});

export const CreateOrderDraftInputSchema = z.object({
  customerEmail: z.string().email('Valid customer email is required').describe('Customer email address'),
  customerName: z.string().optional().describe('Customer display name'),
  cartId: z.string().optional().describe('Existing cart ID if converting cart to order'),
  items: z.array(CartItemInputSchema).min(1).optional().describe('Direct items list if not referencing a cart'),
  shippingAddress: ShippingAddressSchema.optional().describe('Customer destination shipping address'),
  couponCode: z.string().optional().describe('Optional coupon discount code'),
  deliveryMethod: z.enum(['shipping', 'pickup']),
  paymentMethod: z.string().min(1).max(50),
  customerConfirmed: z.literal(true),
  idempotencyKey: z.string().min(8, 'idempotencyKey must be at least 8 characters').max(128).describe('Unique client-generated idempotency key'),
}).strict().refine(input => Boolean(input.cartId) !== Boolean(input.items), 'Exactly one of cartId or items is required')
  .refine(input => input.deliveryMethod !== 'shipping' || Boolean(input.shippingAddress), 'Shipping address required for shipping');
export type CreateOrderDraftInput = z.infer<typeof CreateOrderDraftInputSchema>;

export const CreateOrderDraftOutputSchema = z.object({
  draftOrderId: z.string(),
  status: z.literal('draft').describe('Order draft status only; not paid'),
  customerEmail: z.string(),
  subtotal: z.number().nonnegative(),
  discountAmount: z.number().nonnegative(),
  shippingCost: z.number().nonnegative(),
  total: z.number().nonnegative(),
  currency: z.string().default('MXN'),
  checkoutUrl: z.string().describe('URL where customer securely completes payment outside AI chat'),
  paymentStatus: z.literal('unpaid'),
  requiresCustomerPaymentConfirmation: z.literal(true),
  createdAt: z.string(),
});
export type CreateOrderDraftOutput = z.infer<typeof CreateOrderDraftOutputSchema>;

// ============================================================================
// 10. get_order_status
// ============================================================================
export const GetOrderStatusInputSchema = z.strictObject({
  orderId: z.string().min(1, 'Order ID is required').describe('Unique order ID'),
  customerEmail: z.string().email('Customer email is required for privacy verification').describe('Customer email for ownership verification'),
});
export type GetOrderStatusInput = z.infer<typeof GetOrderStatusInputSchema>;

export const OrderTimelineEventSchema = z.object({
  event: z.string(),
  timestamp: z.string(),
});

export const OrderStatusItemSchema = z.object({
  name: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export const GetOrderStatusOutputSchema = z.object({
  orderId: z.string(),
  status: z.string().describe('Fulfillment status (e.g. pendiente, pagado, empacado, enviado, entregado)'),
  createdAt: z.string(),
  total: z.number(),
  currency: z.string().default('MXN'),
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  items: z.array(OrderStatusItemSchema),
  timeline: z.array(OrderTimelineEventSchema).optional(),
});
export type GetOrderStatusOutput = z.infer<typeof GetOrderStatusOutputSchema>;

// ============================================================================
// 11. request_human_handoff (Mutating - Idempotency Required)
// ============================================================================
export const RequestHumanHandoffInputSchema = z.strictObject({
  reason: z.enum([
    'complex_inquiry',
    'complaint',
    'payment_issue',
    'return_request',
    'customer_requested',
    'technical_issue',
    'other',
  ]).describe('Categorical reason for human support escalation'),
  summary: z.string().min(5, 'Summary must be at least 5 characters').max(500, 'Summary exceeds max 500 characters').describe('Brief context summary of customer issue'),
  customerEmail: z.string().email().optional().describe('Customer email for ticket contact'),
  orderId: z.string().optional().describe('Relevant order ID if applicable'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  idempotencyKey: z.string().min(8, 'idempotencyKey must be at least 8 characters').max(128).describe('Unique client-generated idempotency key'),
});
export type RequestHumanHandoffInput = z.infer<typeof RequestHumanHandoffInputSchema>;

export const RequestHumanHandoffOutputSchema = z.object({
  ticketId: z.string(),
  status: z.enum(['queued', 'assigned', 'pending_human_agent']),
  priority: z.string(),
  reason: z.string(),
  estimatedWaitMinutes: z.number().int().nonnegative(),
  handoffTimestamp: z.string(),
  confirmationMessage: z.string(),
});
export type RequestHumanHandoffOutput = z.infer<typeof RequestHumanHandoffOutputSchema>;
