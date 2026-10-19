// @vitest-environment node
import { createHmac } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createMessagingRouter } from '../../../src/server/ai/messaging-router';
import { CustomerCareOrchestrator } from '../../../src/server/ai/customer-care-orchestrator';
import { AiToolRegistry } from '../../../src/server/ai/tools/tool-registry';
import { InMemoryCommerceAdapter } from '../../../src/server/ai/tools/commerce-adapter';
import { AuthoritativeCommerceAdapter } from '../../../src/server/ai/tools/authoritative-commerce-adapter';
import { InMemoryCatalogRepository } from '../../../src/services/meta-commerce/catalog-repository';
import type { GoogleAiProvider } from '../../../src/server/ai/google-provider-types';

const context = { storeId: 'test-store', userId: 'channel-customer', isAuthenticated: true, channel: 'messenger' as const };
const product = { id: 'shirt-1', name: 'Playera', price: 350, stock: 2, status: 'active',
  variants: [{ id: 'shirt-m', name: 'Negro / M', price: 360, stock: 2 }] } as any;
const backend = new InMemoryCommerceAdapter([], []);
function catalogAdapter(p = product) {
  return new AuthoritativeCommerceAdapter('test-store', 'MXN', new InMemoryCatalogRepository([p]), backend);
}
const payload = (mid = 'mid-test') => JSON.stringify({ object: 'page', entry: [{ id: 'page-test', messaging: [{
  sender: { id: 'customer-test' }, recipient: { id: 'page-test' }, timestamp: Date.now(),
  message: { mid, text: 'cuanto cuesta?' },
}] }] });
const signature = (body: string) => 'sha256=' + createHmac('sha256', 'fixture-only').update(body).digest('hex');
function appWith(persistDraft: any, resolveIdentity: any = async () => context) {
  const generate = vi.fn(async () => ({ functionCalls: [{ name: 'get_price',
    args: { productId: 'shirt-1', variantName: 'Negro / M' } }] }));
  const orchestrator = new CustomerCareOrchestrator({ generate } as unknown as GoogleAiProvider,
    new AiToolRegistry(catalogAdapter()));
  const app = express();
  app.use('/api/webhooks/meta', createMessagingRouter({ appSecret: 'fixture-only', verifyToken: 'fixture-verify' },
    { orchestrator, resolveIdentity, persistDraft }));
  app.use(express.json());
  return { app, generate };
}

describe('sales webhook composition', () => {
  it('verifies challenge and preserves signed raw bytes before JSON middleware', async () => {
    const persist = vi.fn(); const { app, generate } = appWith(persist);
    const challenge = await request(app).get('/api/webhooks/meta').query({
      'hub.mode': 'subscribe', 'hub.verify_token': 'fixture-verify', 'hub.challenge': '123',
    });
    expect(challenge.status).toBe(200); expect(challenge.text).toBe('123');
    const body = payload();
    const result = await request(app).post('/api/webhooks/meta').set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signature(body)).send(body);
    expect(result.status).toBe(200);
    expect(persist.mock.calls[0][1].draft.text).toContain('360 MXN');
    expect(persist.mock.calls[0][1].draft.text).not.toContain('undefined');
    expect(result.body.events).toBeUndefined();
    const replay = await request(app).post('/api/webhooks/meta').set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signature(body)).send(body);
    expect(replay.body.duplicate).toBe(true); expect(generate).toHaveBeenCalledTimes(1);
    expect(persist).toHaveBeenCalledTimes(1);
  });
  it('retries persistence failures without repeating provider/tool action in the same process', async () => {
    const persist = vi.fn().mockRejectedValueOnce(new Error('fixture failure')).mockResolvedValue(undefined);
    const { app, generate } = appWith(persist); const body = payload();
    const send = () => request(app).post('/api/webhooks/meta').set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signature(body)).send(body);
    expect((await send()).status).toBe(503); expect((await send()).status).toBe(200);
    expect(generate).toHaveBeenCalledTimes(1);
  });
  it('rejects forged signatures and unmapped identities before Google execution', async () => {
    const { app, generate } = appWith(vi.fn(), async () => ({ ...context, isAuthenticated: false }));
    const body = payload();
    expect((await request(app).post('/api/webhooks/meta').set('Content-Type', 'application/json')
      .set('x-hub-signature-256', 'sha256=' + '0'.repeat(64)).send(body)).status).toBe(401);
    expect((await request(app).post('/api/webhooks/meta').set('Content-Type', 'application/json')
      .set('x-hub-signature-256', signature(body)).send(body)).status).toBe(503);
    expect(generate).not.toHaveBeenCalled();
  });
});

describe('authoritative stock and price adapter', () => {
  it('persists a handoff tool effect and stops only that conversation', async () => {
    const generate = vi.fn(async () => ({ functionCalls: [{ name: 'get_price', args: { productId: 'shirt-1', variantName: 'Negro / M' } }] }));
    const handoff = vi.spyOn(backend, 'requestHumanHandoff');
    const engine = new CustomerCareOrchestrator({ generate } as unknown as GoogleAiProvider, new AiToolRegistry(catalogAdapter()));
    const inbound = { eventId: 'handoff-1', conversationId: 'conversation-1', externalUserId: 'customer-test',
      recipientId: 'page-test', channel: 'messenger', text: 'quiero hablar con alguien', receivedAt: new Date().toISOString() };
    const first = await engine.run(inbound, context);
    expect(first.toolResults[0].success).toBe(true); expect(handoff).toHaveBeenCalledTimes(1);
    expect(first.state.handoffRequired).toBe(true);
    await engine.run({ ...inbound, eventId: 'next', text: 'precio?' }, context);
    expect(generate).not.toHaveBeenCalled();
    await engine.run({ ...inbound, eventId: 'other', conversationId: 'conversation-2', text: 'precio?' }, context);
    expect(generate).toHaveBeenCalledTimes(1);
    handoff.mockRestore();
  });
  it('requires exact variant and rejects absent or ambiguous mapping', async () => {
    const adapter = catalogAdapter();
    await expect(adapter.getVariantStock({ productId: 'shirt-1' }, context)).rejects.toThrow('VARIANT_SELECTION_REQUIRED');
    await expect(adapter.getVariantStock({ productId: 'shirt-1', variantName: 'invented' }, context)).rejects.toThrow();
    expect(await adapter.getVariantStock({ productId: 'shirt-1', variantName: 'Negro / M' }, context))
      .toMatchObject({ inStock: true, availableQuantity: 2 });
    const ambiguous = catalogAdapter({ ...product, variants: [...product.variants, ...product.variants] });
    await expect(ambiguous.getPrice({ productId: 'shirt-1', variantName: 'Negro / M' }, context)).rejects.toThrow();
  });
  it('never invents stock, discounts, or cross-store access', async () => {
    const invalid = catalogAdapter({ ...product, variants: [{ name: 'Negro / M', stock: null }] });
    await expect(invalid.getVariantStock({ productId: 'shirt-1', variantName: 'Negro / M' }, context)).rejects.toThrow('STOCK_UNCONFIRMED');
    await expect(catalogAdapter().getPrice({ productId: 'shirt-1', couponCode: 'invented' }, context)).rejects.toThrow();
    await expect(catalogAdapter().getProduct({ productId: 'shirt-1' }, { ...context, storeId: 'other' })).rejects.toThrow('FORBIDDEN');
  });
});
