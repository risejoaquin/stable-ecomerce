/**
 * Google AI Customer Care - Restricted Commerce Tool Registry Types
 *
 * Enforces strict boundaries:
 * - DIRECT_DB_AUTHORITY=NO
 * - PAYMENT_CAPTURE_AUTHORITY=NO
 * - ARBITRARY_TOOL_EXECUTION=NO
 */

import type { z } from 'zod';
import type { GoogleAiFunctionDeclaration, GoogleAiTool } from '../google-provider-types.js';

/**
 * The ONLY 11 allowed commerce tools for the AI customer care agent.
 * Arbitrary tool execution is strictly forbidden.
 */
export const ALLOWED_TOOL_NAMES = [
  'search_products',
  'get_product',
  'get_variant_stock',
  'get_price',
  'get_delivery_options',
  'get_payment_options',
  'create_cart',
  'update_cart',
  'create_order_draft',
  'get_order_status',
  'request_human_handoff',
] as const;

export type AllowedToolName = (typeof ALLOWED_TOOL_NAMES)[number];

export function isAllowedToolName(name: string): name is AllowedToolName {
  return (ALLOWED_TOOL_NAMES as readonly string[]).includes(name);
}

/**
 * Caller context passed to tool execution.
 * Provides tenant, user authentication, and channel boundaries.
 */
export interface AiToolContext {
  storeId?: string;
  storeSlug?: string;
  userId?: string;
  customerEmail?: string;
  customerName?: string;
  shippingAddress?: { street?: string; postalCode: string; city: string; state?: string; country?: string };
  selectedProductId?: string;
  selectedVariantName?: string;
  quantity?: number;
  cartId?: string;
  deliveryMethod?: 'shipping' | 'pickup';
  paymentMethod?: string;
  postalCode?: string;
  isAuthenticated?: boolean;
  roles?: string[];
  correlationId?: string;
  channel?: 'web' | 'chat' | 'internal' | 'instagram' | 'messenger';
}

/**
 * Explicit security and authorization policy defined per tool.
 */
export interface AiToolPolicy {
  readonly name: AllowedToolName;
  readonly description: string;
  readonly isMutating: boolean;
  readonly requiresAuth: boolean;
  readonly requiresCustomerEmail: boolean;
  readonly requiredRoles?: string[];
  readonly idempotencyRequired: boolean;
  readonly directDbAuthority: false;
  readonly paymentCaptureAuthority: false;
}

/**
 * Audit metadata captured for every tool invocation with PII minimization.
 */
export interface AiToolAuditMetadata {
  toolName: AllowedToolName | string;
  executionId: string;
  timestamp: string;
  durationMs: number;
  success: boolean;
  errorCode?: string;
  idempotencyKey?: string;
  sanitizedArgs: Record<string, unknown>;
  piiMinified: true;
}

/**
 * Structured tool execution result.
 * Failure is explicit and can NEVER be interpreted as success.
 */
export interface AiToolExecutionResult<TData = unknown> {
  success: boolean;
  data?: TData;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  auditMetadata: AiToolAuditMetadata;
}

/**
 * Commerce Service Adapter Interface
 * All tools communicate through this typed abstraction, decoupling the AI
 * layer from database clients, SQL, or payment gateways.
 */
export interface CommerceServiceAdapter {
  searchProducts(params: unknown, context: AiToolContext): Promise<unknown>;
  getProduct(params: unknown, context: AiToolContext): Promise<unknown>;
  getVariantStock(params: unknown, context: AiToolContext): Promise<unknown>;
  getPrice(params: unknown, context: AiToolContext): Promise<unknown>;
  getDeliveryOptions(params: unknown, context: AiToolContext): Promise<unknown>;
  getPaymentOptions(params: unknown, context: AiToolContext): Promise<unknown>;
  createCart(params: unknown, context: AiToolContext): Promise<unknown>;
  updateCart(params: unknown, context: AiToolContext): Promise<unknown>;
  createOrderDraft(params: unknown, context: AiToolContext): Promise<unknown>;
  getOrderStatus(params: unknown, context: AiToolContext): Promise<unknown>;
  requestHumanHandoff(params: unknown, context: AiToolContext): Promise<unknown>;
}

/**
 * Definition of an individual AI Tool.
 */
export interface AiToolDefinition<TInput = any, TOutput = any> {
  readonly name: AllowedToolName;
  readonly description: string;
  readonly policy: AiToolPolicy;
  readonly inputSchema: z.ZodType<TInput>;
  readonly outputSchema: z.ZodType<TOutput>;
  readonly execute: (
    input: TInput,
    context: AiToolContext,
    adapter: CommerceServiceAdapter
  ) => Promise<TOutput>;
  toGeminiDeclaration(): GoogleAiFunctionDeclaration;
}

/**
 * Tool Registry Interface
 */
export interface AiToolRegistryContract {
  getTool(name: string): AiToolDefinition | undefined;
  listTools(): readonly AiToolDefinition[];
  getGeminiTools(): GoogleAiTool[];
  executeTool(
    name: string,
    rawArgs: unknown,
    context?: AiToolContext
  ): Promise<AiToolExecutionResult>;
}
