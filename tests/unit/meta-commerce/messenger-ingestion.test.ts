import { describe, expect, it } from 'vitest';
import { normalizeMetaWebhookPayload } from '../../../src/services/meta-commerce/webhook-normalizer';

const message = (object: string, echo = false) => ({ object, entry: [{ id: 'page-test', messaging: [{
  sender: { id: 'customer-test' }, recipient: { id: 'page-test' }, timestamp: 1700000000000,
  message: { mid: 'message-test', text: 'tienes M?', is_echo: echo },
}] }] });

describe('shared Instagram and Messenger normalization', () => {
  it('scopes Messenger identity and deduplication separately from Instagram', () => {
    const [page] = normalizeMetaWebhookPayload(message('page'));
    const [instagram] = normalizeMetaWebhookPayload(message('instagram'));
    expect(page.channel).toBe('messenger');
    expect(page.conversationId).toBe('messenger:page-test:customer-test');
    expect(page.eventId).not.toBe(instagram.eventId);
    expect(normalizeMetaWebhookPayload(message('page'))[0].eventId).toBe(page.eventId);
  });
  it('ignores outbound echoes in both channels', () => {
    expect(normalizeMetaWebhookPayload(message('page', true))).toEqual([]);
    expect(normalizeMetaWebhookPayload(message('instagram', true))).toEqual([]);
  });
  it('fails closed for unsupported envelope channels', () => {
    expect(() => normalizeMetaWebhookPayload(message('whatsapp_business_account'))).toThrow();
  });
});
