import type { WebhookIdempotencyRecord } from './webhook-types';

export interface WebhookIdempotencyStore {
  claim(eventId: string): Promise<'claimed' | 'busy' | 'processed'>;
  release(eventId: string): Promise<void>;
  isProcessed(eventId: string): Promise<boolean>;
  recordProcessed(record: WebhookIdempotencyRecord): Promise<void>;
  getRecord(eventId: string): Promise<WebhookIdempotencyRecord | null>;
  clear(): void;
}

interface StoredEntry {
  record: WebhookIdempotencyRecord;
  expiresAt: number;
}

/**
 * In-memory idempotency store with configurable TTL and zero external migrations.
 */
export class InMemoryWebhookIdempotencyStore implements WebhookIdempotencyStore {
  private readonly claims = new Set<string>();

  async claim(eventId: string): Promise<'claimed' | 'busy' | 'processed'> {
    this.prune();
    if (this.store.has(eventId)) return 'processed';
    if (this.claims.has(eventId)) return 'busy';
    this.claims.add(eventId);
    return 'claimed';
  }

  async release(eventId: string): Promise<void> {
    this.claims.delete(eventId);
  }
  private readonly store = new Map<string, StoredEntry>();
  private readonly ttlMs: number;

  constructor(ttlHours: number = 24) {
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  /**
   * Cleans up expired idempotency keys.
   */
  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }

  async isProcessed(eventId: string): Promise<boolean> {
    this.prune();
    const entry = this.store.get(eventId);
    if (!entry) {
      return false;
    }
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(eventId);
      return false;
    }
    return true;
  }

  async recordProcessed(record: WebhookIdempotencyRecord): Promise<void> {
    this.prune();
    const now = Date.now();
    this.store.set(record.eventId, {
      record: { ...record },
      expiresAt: now + this.ttlMs,
    });
  }

  async getRecord(eventId: string): Promise<WebhookIdempotencyRecord | null> {
    this.prune();
    const entry = this.store.get(eventId);
    if (!entry || entry.expiresAt <= Date.now()) {
      return null;
    }
    return { ...entry.record };
  }

  clear(): void {
    this.store.clear();
    this.claims.clear();
  }

  size(): number {
    this.prune();
    return this.store.size;
  }
}

/**
 * High-level manager coordinating replay detection and event tracking.
 */
export class WebhookIdempotencyManager {
  constructor(private readonly store: WebhookIdempotencyStore = new InMemoryWebhookIdempotencyStore()) {}

  claim(eventId: string) { return this.store.claim(eventId); }
  release(eventId: string) { return this.store.release(eventId); }
  async complete(eventId: string, rawPayloadHash: string, channel: string): Promise<void> {
    await this.store.recordProcessed({ eventId, rawPayloadHash, channel,
      processedAt: new Date().toISOString(), status: 'processed' });
    await this.store.release(eventId);
  }

  /**
   * Checks whether the event is a replay. If not, marks it as processed.
   * Returns true if this is a duplicate event, false if it's the first time processing.
   */
  async checkAndMark(
    eventId: string,
    rawPayloadHash: string,
    channel: string = 'instagram',
  ): Promise<{ duplicate: boolean; existingRecord?: WebhookIdempotencyRecord | null }> {
    const claim = await this.store.claim(eventId);
    if (claim !== 'claimed') {
      const existing = await this.store.getRecord(eventId);
      return { duplicate: true, existingRecord: existing };
    }

    const record: WebhookIdempotencyRecord = {
      eventId,
      processedAt: new Date().toISOString(),
      status: 'processed',
      rawPayloadHash,
      channel,
    };

    await this.store.recordProcessed(record);
    await this.store.release(eventId);
    return { duplicate: false };
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
