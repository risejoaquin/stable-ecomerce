import crypto from 'node:crypto';
import type {
  BackendOrderContract,
  BackendOrderPayload,
  OrderDraft,
} from './order-types';
import { OrderDraftSchema } from './order-types';

export interface IdempotencyRecord {
  idempotencyKey: string;
  draftId: string;
  backendOrderId: string | null;
  createdAt: string;
}

/**
 * Repository interface for order drafts and backend order creation.
 */
export interface OrderDraftRepository {
  saveDraft(draft: OrderDraft): Promise<OrderDraft>;
  findDraftById(id: string): Promise<OrderDraft | null>;
  findActiveDraftByConversationId(conversationId: string): Promise<OrderDraft | null>;
  findDraftByIdempotencyKey(key: string): Promise<OrderDraft | null>;
  findDraftByMessageId(messageId: string): Promise<OrderDraft | null>;
  recordIdempotency(key: string, record: { draftId: string; backendOrderId?: string | null }): Promise<void>;
  checkIdempotency(key: string): Promise<{ draftId: string; backendOrderId?: string | null } | null>;
  createBackendOrder(payload: BackendOrderPayload): Promise<BackendOrderContract>;
  findBackendOrderById(orderId: string): Promise<BackendOrderContract | null>;
}

/**
 * Pure in-memory order repository.
 * Zero database access, completely isolated, suitable for testing and simulation.
 * Ensures strict rule: no production order mutation in tests.
 */
export class InMemoryOrderDraftRepository implements OrderDraftRepository {
  private readonly drafts = new Map<string, OrderDraft>();
  private readonly backendOrders = new Map<string, BackendOrderContract>();
  private readonly idempotencyStore = new Map<string, IdempotencyRecord>();
  private readonly messageIdIndex = new Map<string, string>(); // messageId -> draftId
  private simulateFailure = false;
  private failureReason = 'Simulated backend order creation failure';

  /**
   * Diagnostic helper to test backend failure handling without touching production.
   */
  public setSimulateBackendFailure(simulate: boolean, reason?: string): void {
    this.simulateFailure = simulate;
    if (reason) this.failureReason = reason;
  }

  async saveDraft(draft: OrderDraft): Promise<OrderDraft> {
    const validated = OrderDraftSchema.parse(draft);
    const cloned: OrderDraft = JSON.parse(JSON.stringify(validated));
    this.drafts.set(cloned.id, cloned);

    if (cloned.lastMessageId) {
      this.messageIdIndex.set(cloned.lastMessageId, cloned.id);
    }
    if (cloned.idempotencyKey) {
      this.idempotencyStore.set(cloned.idempotencyKey, {
        idempotencyKey: cloned.idempotencyKey,
        draftId: cloned.id,
        backendOrderId: cloned.backendOrderId || null,
        createdAt: new Date().toISOString(),
      });
    }

    return JSON.parse(JSON.stringify(cloned));
  }

  async findDraftById(id: string): Promise<OrderDraft | null> {
    const draft = this.drafts.get(id);
    if (!draft) return null;
    return JSON.parse(JSON.stringify(draft));
  }

  async findActiveDraftByConversationId(conversationId: string): Promise<OrderDraft | null> {
    for (const draft of this.drafts.values()) {
      if (
        draft.conversationId === conversationId &&
        draft.status !== 'cancelled' &&
        draft.status !== 'confirmed'
      ) {
        return JSON.parse(JSON.stringify(draft));
      }
    }
    return null;
  }

  async findDraftByIdempotencyKey(key: string): Promise<OrderDraft | null> {
    const record = this.idempotencyStore.get(key);
    if (!record) return null;
    return this.findDraftById(record.draftId);
  }

  async findDraftByMessageId(messageId: string): Promise<OrderDraft | null> {
    const draftId = this.messageIdIndex.get(messageId);
    if (!draftId) return null;
    return this.findDraftById(draftId);
  }

  async recordIdempotency(
    key: string,
    record: { draftId: string; backendOrderId?: string | null },
  ): Promise<void> {
    this.idempotencyStore.set(key, {
      idempotencyKey: key,
      draftId: record.draftId,
      backendOrderId: record.backendOrderId || null,
      createdAt: new Date().toISOString(),
    });
  }

  async checkIdempotency(
    key: string,
  ): Promise<{ draftId: string; backendOrderId?: string | null } | null> {
    const rec = this.idempotencyStore.get(key);
    if (!rec) return null;
    return {
      draftId: rec.draftId,
      backendOrderId: rec.backendOrderId,
    };
  }

  async createBackendOrder(payload: BackendOrderPayload): Promise<BackendOrderContract> {
    if (this.simulateFailure) {
      throw new Error(this.failureReason);
    }

    const orderId = `ord_live_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const contract: BackendOrderContract = {
      id: orderId,
      created_at: now,
      store_id: payload.store_id,
      customer_user_id: payload.customer_user_id ?? null,
      customer_email: payload.customer_email ?? null,
      status: 'pendiente',
      subtotal: payload.subtotal,
      total: payload.total,
      currency: 'mxn',
      coupon_code: payload.coupon_code ?? null,
      discount_amount: payload.discount_amount ?? 0,
      delivery_method: payload.delivery_method ?? null,
      payment_method: payload.payment_method ?? null,
      shipping_address: payload.shipping_address ?? null,
      metadata: payload.metadata ? { ...payload.metadata } : {},
      order_items: payload.order_items.map((item) => ({ ...item })),
    };

    this.backendOrders.set(orderId, JSON.parse(JSON.stringify(contract)));
    return JSON.parse(JSON.stringify(contract));
  }

  async findBackendOrderById(orderId: string): Promise<BackendOrderContract | null> {
    const order = this.backendOrders.get(orderId);
    if (!order) return null;
    return JSON.parse(JSON.stringify(order));
  }

  /**
   * Diagnostic inspection methods for assertions in tests.
   */
  getAllDrafts(): OrderDraft[] {
    return Array.from(this.drafts.values()).map((d) => JSON.parse(JSON.stringify(d)));
  }

  getAllBackendOrders(): BackendOrderContract[] {
    return Array.from(this.backendOrders.values()).map((o) => JSON.parse(JSON.stringify(o)));
  }

  clear(): void {
    this.drafts.clear();
    this.backendOrders.clear();
    this.idempotencyStore.clear();
    this.messageIdIndex.clear();
    this.simulateFailure = false;
  }
}
