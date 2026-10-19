import { describe, it, expect, vi } from 'vitest';
import { AiToolRegistry } from '../../../src/server/ai/tools/tool-registry.js';
import { InMemoryCommerceAdapter } from '../../../src/server/ai/tools/commerce-adapter.js';
import { ALLOWED_TOOL_NAMES } from '../../../src/server/ai/tools/tool-types.js';

const context = { storeId: 'store-001', userId: 'customer-001', isAuthenticated: true, customerEmail: 'cliente@example.com', channel: 'instagram' as const };
const cart = { items: [{ productId: 'prod-001', quantity: 1 }], idempotencyKey: 'cart-key-0001' };
const inputs = {
  search_products: { query: '*' }, get_product: { productId: 'prod-001' },
  get_variant_stock: { productId: 'prod-001' }, get_price: { productId: 'prod-001' },
  get_delivery_options: { postalCode: '83000' }, get_payment_options: {},
  create_cart: cart,
  create_order_draft: { items: [{ productId: 'prod-001', quantity: 1 }], customerEmail: context.customerEmail, deliveryMethod: 'pickup', paymentMethod: 'transfer', customerConfirmed: true, idempotencyKey: 'draft-key-0001' },
  get_order_status: { orderId: 'ord-1001', customerEmail: context.customerEmail },
  request_human_handoff: { reason: 'customer_requested', summary: 'Please help', idempotencyKey: 'handoff-key' },
};

describe('restricted executable tool registry', () => {
  it('exports exactly eleven executable declarations and exercises every tool', async () => {
    const registry = new AiToolRegistry();
    expect(registry.listTools().map(t => t.name)).toEqual(ALLOWED_TOOL_NAMES);
    expect(registry.getGeminiTools()[0].functionDeclarations).toHaveLength(11);
    for (const [name, input] of Object.entries(inputs)) expect((await registry.executeTool(name, input, context)).success, name).toBe(true);
    const created = await registry.executeTool('create_cart', cart, context);
    expect((await registry.executeTool('update_cart', { cartId: (created.data as any).cartId, action: 'clear', idempotencyKey: 'clear-key' }, context)).success).toBe(true);
  });

  it('rejects unknown tools, invalid inputs, missing context and spoofed emails', async () => {
    const adapter = new InMemoryCommerceAdapter();
    const spy = vi.spyOn(adapter, 'createCart');
    const registry = new AiToolRegistry(adapter);
    expect((await registry.executeTool('shell', {}, context)).error?.code).toBe('UNKNOWN_TOOL');
    expect((await registry.executeTool('create_cart', { ...cart, items: [] }, context)).error?.code).toBe('INVALID_ARGUMENTS');
    expect((await registry.executeTool('create_cart', cart)).error?.code).toBe('FORBIDDEN');
    expect((await registry.executeTool('create_cart', { ...cart, customerEmail: 'victim@example.com' }, context)).error?.code).toBe('FORBIDDEN');
    expect(spy).not.toHaveBeenCalled();
    expect((await registry.executeTool('create_cart', { ...cart, sql: 'SELECT 1' }, context)).error?.code).toBe('INVALID_ARGUMENTS');
    expect((await registry.executeTool('create_cart', { ...cart, items: [{ ...cart.items[0], price: 0 }] }, context)).error?.code).toBe('INVALID_ARGUMENTS');
    expect((await registry.executeTool('update_cart', { cartId: 'x', action: 'add_item', idempotencyKey: 'invalid-key' }, context)).error?.code).toBe('INVALID_ARGUMENTS');
    expect((await registry.executeTool('create_order_draft', { customerEmail: context.customerEmail, idempotencyKey: 'invalid-key' }, context)).success).toBe(false);
    for (const name of ALLOWED_TOOL_NAMES) {
      expect((await registry.executeTool(name, {}, { ...context, isAuthenticated: false })).error?.code, name).toBe('FORBIDDEN');
      expect((await registry.executeTool(name, {}, { ...context, storeId: undefined })).error?.code, name).toBe('FORBIDDEN');
    }
  });

  it('coalesces concurrent duplicates and rejects in-flight and completed payload conflicts', async () => {
    const adapter = new InMemoryCommerceAdapter();
    const spy = vi.spyOn(adapter, 'createCart');
    const registry = new AiToolRegistry(adapter);
    const pending = registry.executeTool('create_cart', cart, context);
    const conflict = await registry.executeTool('create_cart', { ...cart, items: [{ productId: 'prod-002', quantity: 2 }] }, context);
    expect(conflict.error?.code).toBe('IDEMPOTENCY_CONFLICT');
    const results = await Promise.all([pending, ...Array.from({ length: 20 }, () => registry.executeTool('create_cart', cart, context))]);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(new Set(results.map(r => (r.data as any).cartId)).size).toBe(1);
    expect((await registry.executeTool('create_cart', { ...cart, items: [{ productId: 'prod-001', quantity: 2 }] }, context)).error?.code).toBe('IDEMPOTENCY_CONFLICT');
    await registry.executeTool('create_cart', cart, { ...context, storeId: 'other' });
    await registry.executeTool('create_cart', cart, { ...context, userId: 'other' });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('fails closed on malformed results and adapter exceptions without leaking PII', async () => {
    const adapter = new InMemoryCommerceAdapter();
    vi.spyOn(adapter, 'createCart').mockResolvedValue({} as any);
    const registry = new AiToolRegistry(adapter);
    const result = await registry.executeTool('create_cart', { ...cart, customerEmail: context.customerEmail }, context);
    expect(result.error?.code).toBe('INVALID_RESULT');
    expect(result.data).toBeUndefined();
    adapter.simulateError('get_product', new Error('secret customer@example.com'));
    const failed = await registry.executeTool('get_product', { productId: 'prod-001' }, context);
    expect(failed.error?.code).toBe('ADAPTER_ERROR');
    expect(JSON.stringify([result.auditMetadata, failed])).not.toContain('example.com');
    expect(result.auditMetadata.sanitizedArgs).toEqual({});
  });

  it('never converts an explicit adapter failure into success and retains uncertain mutation failures', async () => {
    const adapter = new InMemoryCommerceAdapter();
    const spy = vi.spyOn(adapter, 'createCart').mockResolvedValue({
      success: false, error: 'private detail', cartId: 'fake', itemsCount: 1,
      subtotal: 1, currency: 'MXN', createdAt: new Date().toISOString(),
    } as any);
    const registry = new AiToolRegistry(adapter);
    for (let i = 0; i < 2; i++) {
      const result = await registry.executeTool('create_cart', cart, context);
      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
    }
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('deduplicates all mutating tools across registries sharing the adapter', async () => {
    const adapter = new InMemoryCommerceAdapter();
    const first = new AiToolRegistry(adapter);
    const second = new AiToolRegistry(adapter);
    const created = await first.executeTool('create_cart', cart, context);
    const scenarios = [
      ['update_cart', 'updateCart', { cartId: (created.data as any).cartId, action: 'add_item', item: cart.items[0], idempotencyKey: 'update-key' }],
      ['create_order_draft', 'createOrderDraft', inputs.create_order_draft],
      ['request_human_handoff', 'requestHumanHandoff', inputs.request_human_handoff],
    ] as const;
    for (const [tool, method, input] of scenarios) {
      const spy = vi.spyOn(adapter, method);
      const results = await Promise.all(Array.from({ length: 12 }, (_, i) => (i % 2 ? first : second).executeTool(tool, input, context)));
      expect(results.every(r => r.success), tool).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(results.every(r => JSON.stringify(r.data) === JSON.stringify(results[0].data))).toBe(true);
      expect((await first.executeTool(tool, { ...input, ...(tool === 'update_cart' ? { action: 'clear', item: undefined } : tool === 'create_order_draft' ? { couponCode: 'BIENVENIDA10' } : { summary: 'Changed issue' }) }, context)).error?.code).toBe('IDEMPOTENCY_CONFLICT');
    }
  });

  it('denies cross-customer and cross-tenant order/cart access including drafts and handoffs', async () => {
    const registry = new AiToolRegistry();
    const created = await registry.executeTool('create_cart', cart, context);
    const cartId = (created.data as any).cartId;
    for (const stranger of [{ ...context, userId: 'other' }, { ...context, storeId: 'other', channel: 'messenger' as const }]) {
      expect((await registry.executeTool('update_cart', { cartId, action: 'clear', idempotencyKey: 'clear-key' }, stranger)).success).toBe(false);
      expect((await registry.executeTool('create_order_draft', { cartId, customerEmail: context.customerEmail, deliveryMethod: 'pickup', paymentMethod: 'transfer', customerConfirmed: true, idempotencyKey: 'draft-key-0002' }, stranger)).success).toBe(false);
      expect((await registry.executeTool('get_order_status', inputs.get_order_status, stranger)).success).toBe(false);
      expect((await registry.executeTool('request_human_handoff', { ...inputs.request_human_handoff, orderId: 'ord-1001' }, stranger)).success).toBe(false);
    }
    expect((await registry.executeTool('create_order_draft', { ...inputs.create_order_draft, cartId: undefined, items: [{ productId: 'missing', quantity: 1 }] }, context)).success).toBe(false);
  });
});
