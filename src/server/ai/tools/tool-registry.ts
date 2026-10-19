import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import * as schemas from './tool-schemas.js';
import { buildAuditMetadata } from './tool-audit.js';
import { InMemoryCommerceAdapter } from './commerce-adapter.js';
import { ALLOWED_TOOL_NAMES, isAllowedToolName } from './tool-types.js';
import type { AiToolContext, AiToolDefinition, AiToolExecutionResult, AiToolRegistryContract, CommerceServiceAdapter } from './tool-types.js';

const bindings = [
  ['SearchProducts', 'searchProducts'], ['GetProduct', 'getProduct'],
  ['GetVariantStock', 'getVariantStock'], ['GetPrice', 'getPrice'],
  ['GetDeliveryOptions', 'getDeliveryOptions'], ['GetPaymentOptions', 'getPaymentOptions'],
  ['CreateCart', 'createCart'], ['UpdateCart', 'updateCart'],
  ['CreateOrderDraft', 'createOrderDraft'], ['GetOrderStatus', 'getOrderStatus'],
  ['RequestHumanHandoff', 'requestHumanHandoff'],
] as const;
const mutations = new Set(['create_cart', 'update_cart', 'create_order_draft', 'request_human_handoff']);
type Reservation = { payload: string; result: Promise<{ data?: unknown; code?: string }> };
const adapterReservations = new WeakMap<CommerceServiceAdapter, Map<string, Reservation>>();
const contextSchema = z.object({
  storeId: z.string().trim().min(1).max(128),
  userId: z.string().trim().min(1).max(128),
  isAuthenticated: z.literal(true),
  customerEmail: z.string().email().optional(),
  customerName: z.string().trim().min(1).max(120).optional(),
  shippingAddress: z.object({ street: z.string().optional(), postalCode: z.string().min(3).max(10), city: z.string().min(1), state: z.string().optional(), country: z.string().optional() }).strict().optional(),
  selectedProductId: z.string().optional(), selectedVariantName: z.string().optional(),
  quantity: z.number().int().positive().optional(), cartId: z.string().optional(),
  deliveryMethod: z.enum(['shipping', 'pickup']).optional(), paymentMethod: z.string().optional(), postalCode: z.string().optional(),
  channel: z.enum(['web', 'chat', 'internal', 'instagram', 'messenger']).optional(),
  roles: z.array(z.string()).optional(),
  storeSlug: z.string().optional(), correlationId: z.string().optional(),
}).strict();

function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => JSON.stringify(k) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}

/** One registry per adapter lifetime; reservations are atomic within this process. */
export class AiToolRegistry implements AiToolRegistryContract {
  private readonly tools: readonly AiToolDefinition[];
  private readonly reservations: Map<string, Reservation>;

  constructor(private readonly adapter: CommerceServiceAdapter = new InMemoryCommerceAdapter()) {
    this.reservations = adapterReservations.get(adapter) ?? new Map();
    adapterReservations.set(adapter, this.reservations);
    this.tools = ALLOWED_TOOL_NAMES.map((name, index) => {
      const [prefix, method] = bindings[index];
      const inputSchema = schemas[`${prefix}InputSchema`];
      const outputSchema = schemas[`${prefix}OutputSchema`];
      const description = `Restricted commerce operation: ${name}`;
      return Object.freeze({ name, description, inputSchema, outputSchema,
        policy: Object.freeze({ name, description, isMutating: mutations.has(name), requiresAuth: true,
          requiresCustomerEmail: name === 'get_order_status' || name === 'create_order_draft',
          idempotencyRequired: mutations.has(name), directDbAuthority: false as const, paymentCaptureAuthority: false as const }),
        execute: (input: unknown, context: AiToolContext, adapter: CommerceServiceAdapter) => adapter[method](input, context),
        toGeminiDeclaration: () => ({ name, description, parameters: z.toJSONSchema(inputSchema) }),
      });
    });
  }

  getTool(name: string) { return this.tools.find(tool => tool.name === name); }
  listTools() { return Object.freeze([...this.tools]); }
  getGeminiTools() { return [{ functionDeclarations: this.tools.map(tool => tool.toGeminiDeclaration()) }]; }

  async executeTool(name: string, rawArgs: unknown, context: AiToolContext = {}): Promise<AiToolExecutionResult> {
    const startTime = Date.now();
    const executionId = randomUUID();
    const finish = (code?: string, data?: unknown): AiToolExecutionResult => ({
      success: !code, ...(code ? { error: { code, message: 'Tool execution rejected or failed.' } } : { data: structuredClone(data) }),
      auditMetadata: buildAuditMetadata({ toolName: isAllowedToolName(name) ? name : 'unknown', executionId, startTime,
        success: !code, errorCode: code, rawArgs: {} }),
    });
    const tool = this.getTool(name);
    if (!tool) return finish('UNKNOWN_TOOL');
    const trusted = contextSchema.safeParse(context);
    if (!trusted.success) return finish('FORBIDDEN');
    const parsed = tool.inputSchema.safeParse(rawArgs);
    if (!parsed.success) return finish('INVALID_ARGUMENTS');
    const input = parsed.data as Record<string, any>;
    const ctx = trusted.data;
    if ((tool.policy.requiresCustomerEmail && !ctx.customerEmail) ||
        (input.customerEmail && input.customerEmail.toLowerCase() !== ctx.customerEmail?.toLowerCase())) return finish('FORBIDDEN');
    const invoke = async () => {
      try {
        const rawOutput = await tool.execute(input, ctx, this.adapter);
        if (rawOutput && typeof rawOutput === 'object' &&
            (('success' in rawOutput && rawOutput.success === false) || ('error' in rawOutput && rawOutput.error != null))) return { code: 'ADAPTER_ERROR' };
        const output = tool.outputSchema.safeParse(rawOutput);
        return output.success ? { data: structuredClone(output.data) } : { code: 'INVALID_RESULT' };
      } catch { return { code: 'ADAPTER_ERROR' }; }
    };
    if (!tool.policy.isMutating) {
      const result = await invoke();
      return finish(result.code, result.data);
    }
    const scope = JSON.stringify([ctx.storeId, ctx.userId, name, input.idempotencyKey]);
    const payload = createHash('sha256').update(canonical({ input, customerEmail: ctx.customerEmail })).digest('hex');
    const previous = this.reservations.get(scope);
    if (previous && previous.payload !== payload) return finish('IDEMPOTENCY_CONFLICT');
    // Defer execution until after publishing the reservation, including for synchronous adapters.
    const reservation = previous ?? { payload, result: Promise.resolve().then(invoke) };
    if (!previous) this.reservations.set(scope, reservation);
    const result = await reservation.result;
    return finish(result.code, result.data);
  }
}

export function createToolRegistry(adapter?: CommerceServiceAdapter): AiToolRegistry {
  return new AiToolRegistry(adapter);
}
