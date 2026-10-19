// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { MetaCommerceE2ESimulator, buildSimulatedWebhookPayload } from '../../../src/services/meta-commerce/e2e-simulator';
import { createSignedMetaPayload, BLACK_RELIC_MOCK_CATALOG } from '../../../src/services/meta-commerce/fixtures';
import { SupabaseCatalogAdapter } from '../../../src/services/meta-commerce/catalog-repository';
import { buildMetaCatalogItem } from '../../../src/services/meta-commerce/meta-catalog-mapper';

describe('Directed recovery adversarial regressions', () => {
  it('releases failed claims and applies concurrent retries only once', async () => {
    const sim = new MetaCommerceE2ESimulator({ appSecret: 'local-test-only' });
    const signed = createSignedMetaPayload(buildSimulatedWebhookPayload({ text: 'Hola', messageId: 'retry-test' }), 'local-test-only');
    const apply = vi.spyOn(sim.convService, 'applyEvent').mockRejectedValueOnce(new Error('local failure'));
    const send = () => sim.webhookService.ingestPayload(signed.rawBuffer, signed.signatureHeader);
    const failed = await send();
    expect(failed.statusCode).toBe(503);
    expect(failed.body).toMatchObject({ processed: false });
    const retries = await Promise.all(Array.from({ length: 20 }, send));
    expect(retries.some((reply) => reply.statusCode === 200)).toBe(true);
    expect(apply).toHaveBeenCalledTimes(2);
    expect(retries.flatMap((reply) => (reply.body as any).events ?? [])).toHaveLength(1);
    const replay = await send();
    expect(replay.body).toMatchObject({ processed: true, duplicate: true });
    expect((replay.body as any).events).toEqual([]);
    expect(apply).toHaveBeenCalledTimes(2);
  });

  it('does not invent stock or price for empty and zero-stock catalogs', async () => {
    const empty = new MetaCommerceE2ESimulator({ catalogProducts: [] });
    for (const number of [1, 2, 3]) {
      const emission = await empty.runScenario(number);
      expect(emission.CATALOG_LOOKUP.authoritativePrice).toBeNull();
      expect(emission.OUTBOUND_DRAFT.text).not.toContain('1,499');
      expect(emission.ORDER_EFFECT.hasEffect).toBe(false);
    }
    const products = structuredClone(BLACK_RELIC_MOCK_CATALOG);
    for (const product of products) {
      product.stock = 0;
      for (const variant of product.variants ?? []) variant.stock = 0;
    }
    const zero = await new MetaCommerceE2ESimulator({ catalogProducts: products }).runScenario(2);
    expect(zero.CATALOG_LOOKUP.authoritativeStock?.availableStock).toBe(0);
    expect(zero.ORDER_EFFECT.hasEffect).toBe(false);
    expect(zero.OUTBOUND_DRAFT.text).not.toContain('5 piezas');
  });

  it('maps variant content IDs through the adapter and rejects collisions', async () => {
    const products = structuredClone(BLACK_RELIC_MOCK_CATALOG);
    const query: any = { select: () => query, order: () => query,
      range: async () => ({ data: products, error: null }) };
    const adapter = new SupabaseCatalogAdapter({ from: () => query });
    const product = products.find((entry) => entry.variants?.length)!;
    const variant = product.variants![0];
    const item = buildMetaCatalogItem(product, variant);
    const result = await adapter.findByMetaContentId(item.id);
    expect(result?.variant).toEqual(variant);
    expect(buildMetaCatalogItem(result!.product, result!.variant)).toEqual(item);
    product.variants!.push({ ...variant, id: 'collision' });
    expect(await adapter.findByMetaContentId(item.id)).toBeNull();
  });

  it('verifies final conversation, order and handoff against repositories', async () => {
    const sim = new MetaCommerceE2ESimulator();
    for (const emission of await sim.runAllScenarios()) {
      const id = emission.NORMALIZED_EVENT.conversationId;
      expect(emission.FINAL_CONVERSATION_STATE).toEqual(id ? await sim.convRepo.findById(id) : null);
      expect(emission.STOCK_SOURCE).toBe('AUTHORITATIVE_ADAPTER');
      expect(emission.MODEL_OR_RULE_ENGINE_INVENTS_STOCK).toBe('NO');
      expect(emission.HANDOFF_STATE).toEqual(id ? await sim.handoffRepo.findByConversationId(id) : null);
      if (emission.ORDER_EFFECT.orderDraftId) {
        const draft = await sim.orderRepo.findDraftById(emission.ORDER_EFFECT.orderDraftId);
        expect(emission.ORDER_EFFECT.total).toBe(draft!.total);
        expect(emission.ORDER_EFFECT.status).toBe(draft!.status);
        if (draft!.backendOrderId) expect(await sim.orderRepo.findBackendOrderById(draft!.backendOrderId)).not.toBeNull();
      }
    }
  });
});
