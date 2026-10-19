// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  type ConversationIntent,
  type ConversationState,
  CONVERSATION_INTENTS,
  ConversationIntentSchema,
  isConversationIntent,
  createConversationState,
  reduceConversationState,
  transitionConversation,
  canProceedToCheckout,
  isConversationHandoffActive,
  serializeConversationState,
  deserializeConversationState,
  validateConversationState,
  safeParseConversationState,
  ConversationHandoffBlockedError,
  InvalidConversationTransitionError,
  InMemoryConversationRepository,
  ConversationService,
} from '../../../src/services/meta-commerce';

describe('Meta Commerce Conversation Domain Model', () => {
  const baseConversationId = 'conv-ig-12345';
  const baseExternalUserId = 'ig-user-98765';

  describe('1. Canonical Intents Coverage', () => {
    const expectedIntents: ConversationIntent[] = [
      'greeting',
      'product_info',
      'price',
      'availability',
      'size',
      'color',
      'shipping',
      'payment',
      'add_to_cart',
      'checkout',
      'order_status',
      'return_exchange',
      'human_help',
      'unknown',
    ];

    it('contains exactly the 14 required canonical intents', () => {
      expect(CONVERSATION_INTENTS).toHaveLength(14);
      expect([...CONVERSATION_INTENTS].sort()).toEqual([...expectedIntents].sort());
    });

    it.each(expectedIntents)('validates canonical intent: %s', (intent) => {
      expect(isConversationIntent(intent)).toBe(true);
      expect(ConversationIntentSchema.safeParse(intent).success).toBe(true);
    });

    it('rejects unknown/arbitrary strings outside canonical intents', () => {
      expect(isConversationIntent('buy_now')).toBe(false);
      expect(isConversationIntent('discount_code')).toBe(false);
      expect(isConversationIntent('')).toBe(false);
      expect(ConversationIntentSchema.safeParse('unsupported_intent').success).toBe(false);
    });
  });

  describe('2. State Initialization and Required Attributes', () => {
    it('initializes a state containing all 16 required attributes', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      // 1. conversation_id
      expect(state.conversation_id).toBe(baseConversationId);
      // 2. channel
      expect(state.channel).toBe('instagram');
      // 3. external_user_id
      expect(state.external_user_id).toBe(baseExternalUserId);
      // 4. current_intent
      expect(state.current_intent).toBe('greeting');
      // 5. current_product_id
      expect(state.current_product_id).toBeNull();
      // 6. current_variant_id
      expect(state.current_variant_id).toBeNull();
      // 7. quantity
      expect(state.quantity).toBe(1);
      // 8. cart_id and order_draft_id
      expect(state.cart_id).toBeNull();
      expect(state.order_draft_id).toBeNull();
      // 9. delivery_method
      expect(state.delivery_method).toBeNull();
      // 10. payment_method
      expect(state.payment_method).toBeNull();
      // 11. shipping_location
      expect(state.shipping_location).toBeNull();
      // 12. last_inbound_at
      expect(state.last_inbound_at).toBeNull();
      // 13. last_outbound_at
      expect(state.last_outbound_at).toBeNull();
      // 14. handoff_required
      expect(state.handoff_required).toBe(false);
      // 15. handoff_reason
      expect(state.handoff_reason).toBeNull();
      // 16. state_version
      expect(state.state_version).toBe(1);
    });

    it('rejects invalid initialization arguments', () => {
      expect(() =>
        createConversationState({ conversation_id: '', external_user_id: 'user-1' }),
      ).toThrow(InvalidConversationTransitionError);

      expect(() =>
        createConversationState({ conversation_id: 'conv-1', external_user_id: '   ' }),
      ).toThrow(InvalidConversationTransitionError);
    });

    it('honors custom channel, initial intent, and timestamp', () => {
      const fixedTime = '2026-10-13T12:00:00.000Z';
      const state = createConversationState({
        conversation_id: 'conv-custom',
        external_user_id: 'user-custom',
        channel: 'whatsapp',
        initial_intent: 'product_info',
        timestamp: fixedTime,
      });

      expect(state.channel).toBe('whatsapp');
      expect(state.current_intent).toBe('product_info');
      expect(state.last_inbound_at).toBe(fixedTime);
      expect(state.created_at).toBe(fixedTime);
      expect(state.updated_at).toBe(fixedTime);
    });
  });

  describe('3. Deterministic Pure Reducer Transitions & Immutability', () => {
    it('never mutates input state and monotonically increments state_version', () => {
      const initial = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
        timestamp: '2026-10-13T10:00:00.000Z',
      });

      const next1 = reduceConversationState(initial, {
        type: 'INBOUND_MESSAGE_RECEIVED',
        text: 'Hola, tienen hoodies?',
        detectedIntent: 'product_info',
        timestamp: '2026-10-13T10:01:00.000Z',
      });

      // Verify immutability
      expect(initial.state_version).toBe(1);
      expect(initial.current_intent).toBe('greeting');
      expect(initial.last_inbound_at).toBe('2026-10-13T10:00:00.000Z');

      // Verify next state
      expect(next1.state_version).toBe(2);
      expect(next1.current_intent).toBe('product_info');
      expect(next1.last_inbound_at).toBe('2026-10-13T10:01:00.000Z');

      const next2 = reduceConversationState(next1, {
        type: 'PRODUCT_SELECTED',
        productId: 'prod-black-hoodie',
        variantId: 'var-size-l',
        quantity: 2,
        timestamp: '2026-10-13T10:02:00.000Z',
      });

      expect(next1.state_version).toBe(2);
      expect(next1.current_product_id).toBeNull();
      expect(next2.state_version).toBe(3);
      expect(next2.current_product_id).toBe('prod-black-hoodie');
      expect(next2.current_variant_id).toBe('var-size-l');
      expect(next2.quantity).toBe(2);
    });

    it('transitions through all canonical commerce events deterministically', () => {
      const initial = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      const fullFlow = transitionConversation(initial, [
        { type: 'INTENT_IDENTIFIED', intent: 'price' },
        { type: 'PRODUCT_SELECTED', productId: 'p-relic-ring' },
        { type: 'VARIANT_SELECTED', variantId: 'v-silver-size-8' },
        { type: 'QUANTITY_SET', quantity: 3 },
        { type: 'DELIVERY_METHOD_SELECTED', deliveryMethod: 'standard_shipping' },
        { type: 'PAYMENT_METHOD_SELECTED', paymentMethod: 'spei_transfer' },
        {
          type: 'SHIPPING_LOCATION_UPDATED',
          shippingLocation: {
            addressLine1: 'Av. Juarez 100',
            city: 'Guadalajara',
            state: 'Jalisco',
            postalCode: '44100',
            recipientName: 'Valeria Castro',
          },
        },
        { type: 'CART_ASSOCIATED', cartId: 'cart-999' },
        { type: 'ORDER_DRAFT_CREATED', orderDraftId: 'draft-order-555' },
        { type: 'OUTBOUND_MESSAGE_SENT', messageId: 'm-out-1' },
      ]);

      expect(fullFlow.state_version).toBe(11);
      expect(fullFlow.current_intent).toBe('price');
      expect(fullFlow.current_product_id).toBe('p-relic-ring');
      expect(fullFlow.current_variant_id).toBe('v-silver-size-8');
      expect(fullFlow.quantity).toBe(3);
      expect(fullFlow.delivery_method).toBe('standard_shipping');
      expect(fullFlow.payment_method).toBe('spei_transfer');
      expect(fullFlow.shipping_location?.city).toBe('Guadalajara');
      expect(fullFlow.cart_id).toBe('cart-999');
      expect(fullFlow.order_draft_id).toBe('draft-order-555');
      expect(fullFlow.last_outbound_at).not.toBeNull();
    });

    it('parses raw text shipping location', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      const next = reduceConversationState(state, {
        type: 'SHIPPING_LOCATION_UPDATED',
        shippingLocation: 'Roma Norte, CDMX CP 06700',
      });

      expect(next.shipping_location?.rawText).toBe('Roma Norte, CDMX CP 06700');
    });

    it('resets state gracefully with STATE_RESET event', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      const modified = reduceConversationState(state, {
        type: 'PRODUCT_SELECTED',
        productId: 'prod-123',
        quantity: 5,
      });

      const reset = reduceConversationState(modified, {
        type: 'STATE_RESET',
        preserveCustomer: true,
      });

      expect(reset.current_product_id).toBeNull();
      expect(reset.quantity).toBe(1);
      expect(reset.state_version).toBe(3);
      expect(reset.conversation_id).toBe(baseConversationId);
      expect(reset.external_user_id).toBe(baseExternalUserId);
    });
  });

  describe('4. Quantity and Transition Validation Invariants', () => {
    it.each([0, -1, -10, 1.5])('rejects invalid quantity: %s', (qty) => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      expect(() =>
        reduceConversationState(state, { type: 'QUANTITY_SET', quantity: qty }),
      ).toThrow(InvalidConversationTransitionError);

      expect(() =>
        reduceConversationState(state, {
          type: 'PRODUCT_SELECTED',
          productId: 'prod-1',
          quantity: qty,
        }),
      ).toThrow(InvalidConversationTransitionError);
    });

    it('rejects invalid intent in INTENT_IDENTIFIED', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      expect(() =>
        reduceConversationState(state, {
          type: 'INTENT_IDENTIFIED',
          intent: 'invalid_intent' as any,
        }),
      ).toThrow(InvalidConversationTransitionError);
    });
  });

  describe('5. Human Handoff Mechanics and Blocking Invariants', () => {
    it('sets handoff_required and switches intent to human_help', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      const handedOff = reduceConversationState(state, {
        type: 'HANDOFF_TRIGGERED',
        reason: 'explicit_human_request',
      });

      expect(handedOff.handoff_required).toBe(true);
      expect(handedOff.handoff_reason).toBe('explicit_human_request');
      expect(handedOff.current_intent).toBe('human_help');
      expect(isConversationHandoffActive(handedOff)).toBe(true);
    });

    it('rejects empty or whitespace handoff reason', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      expect(() =>
        reduceConversationState(state, { type: 'HANDOFF_TRIGGERED', reason: '   ' }),
      ).toThrow(InvalidConversationTransitionError);
    });

    it('blocks commerce actions while handoff is active', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      const handedOff = reduceConversationState(state, {
        type: 'HANDOFF_TRIGGERED',
        reason: 'dispute',
      });

      expect(() =>
        reduceConversationState(handedOff, {
          type: 'PRODUCT_SELECTED',
          productId: 'prod-new',
        }),
      ).toThrow(ConversationHandoffBlockedError);

      expect(() =>
        reduceConversationState(handedOff, {
          type: 'QUANTITY_SET',
          quantity: 2,
        }),
      ).toThrow(ConversationHandoffBlockedError);

      expect(() =>
        reduceConversationState(handedOff, {
          type: 'DELIVERY_METHOD_SELECTED',
          deliveryMethod: 'pickup',
        }),
      ).toThrow(ConversationHandoffBlockedError);
    });

    it('allows message tracking events during handoff', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      const handedOff = reduceConversationState(state, {
        type: 'HANDOFF_TRIGGERED',
        reason: 'operator_intervention',
      });

      const inboundLogged = reduceConversationState(handedOff, {
        type: 'INBOUND_MESSAGE_RECEIVED',
        text: 'Sigo esperando respuesta',
      });
      expect(inboundLogged.handoff_required).toBe(true);
      expect(inboundLogged.last_inbound_at).not.toBeNull();

      const outboundLogged = reduceConversationState(inboundLogged, {
        type: 'OUTBOUND_MESSAGE_SENT',
      });
      expect(outboundLogged.handoff_required).toBe(true);
      expect(outboundLogged.last_outbound_at).not.toBeNull();
    });

    it('unblocks conversation upon HANDOFF_RESOLVED', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      const handedOff = reduceConversationState(state, {
        type: 'HANDOFF_TRIGGERED',
        reason: 'unsupported_request',
      });

      const resolved = reduceConversationState(handedOff, {
        type: 'HANDOFF_RESOLVED',
        resolutionNotes: 'Operator clarified sizing',
      });

      expect(resolved.handoff_required).toBe(false);
      expect(resolved.handoff_reason).toBeNull();
      expect(isConversationHandoffActive(resolved)).toBe(false);

      // Now normal commerce actions succeed again
      const productSelected = reduceConversationState(resolved, {
        type: 'PRODUCT_SELECTED',
        productId: 'prod-hoodie-l',
      });
      expect(productSelected.current_product_id).toBe('prod-hoodie-l');
    });
  });

  describe('6. Checkout Readiness Evaluation', () => {
    it('detects incomplete checkout requirements', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
      });

      const check1 = canProceedToCheckout(state);
      expect(check1.canCheckout).toBe(false);
      expect(check1.missing).toContain('product');
      expect(check1.missing).toContain('delivery_method');
      expect(check1.missing).toContain('payment_method');
      expect(check1.missing).toContain('shipping_location');
    });

    it('blocks checkout readiness if handoff is active', () => {
      const completeState: ConversationState = {
        conversation_id: 'conv-1',
        channel: 'instagram',
        external_user_id: 'usr-1',
        current_intent: 'checkout',
        current_product_id: 'prod-1',
        current_variant_id: 'var-1',
        quantity: 1,
        cart_id: 'cart-1',
        order_draft_id: 'draft-1',
        delivery_method: 'shipping',
        payment_method: 'card',
        shipping_location: { city: 'Monterrey', postalCode: '64000' },
        last_inbound_at: null,
        last_outbound_at: null,
        handoff_required: true,
        handoff_reason: 'explicit_human_request',
        state_version: 5,
      };

      const check = canProceedToCheckout(completeState);
      expect(check.canCheckout).toBe(false);
      expect(check.missing).toContain('handoff_active');
    });

    it('approves complete checkout state', () => {
      const readyState: ConversationState = {
        conversation_id: 'conv-1',
        channel: 'instagram',
        external_user_id: 'usr-1',
        current_intent: 'checkout',
        current_product_id: 'prod-hoodie',
        current_variant_id: 'var-black-xl',
        quantity: 2,
        cart_id: 'cart-100',
        order_draft_id: 'order-draft-100',
        delivery_method: 'express_shipping',
        payment_method: 'spei_transfer',
        shipping_location: {
          addressLine1: 'Av. Reforma 222',
          city: 'CDMX',
          postalCode: '06600',
        },
        last_inbound_at: '2026-10-13T10:00:00.000Z',
        last_outbound_at: '2026-10-13T10:01:00.000Z',
        handoff_required: false,
        handoff_reason: null,
        state_version: 7,
      };

      const check = canProceedToCheckout(readyState);
      expect(check.canCheckout).toBe(true);
      expect(check.missing).toHaveLength(0);
      expect(check.reasons).toHaveLength(0);
    });
  });

  describe('7. Serialization & Deserialization Idempotency', () => {
    it('serializes and deserializes back to identical state', () => {
      const state = createConversationState({
        conversation_id: baseConversationId,
        external_user_id: baseExternalUserId,
        channel: 'instagram',
        initial_intent: 'availability',
      });

      const serialized = serializeConversationState(state);
      expect(typeof serialized).toBe('string');

      const restored = deserializeConversationState(serialized);
      expect(restored).toEqual(state);
      expect(validateConversationState(restored)).toEqual(state);
    });

    it('safeParse returns success for valid and error for invalid state', () => {
      const valid = createConversationState({
        conversation_id: 'c1',
        external_user_id: 'u1',
      });
      expect(safeParseConversationState(valid).success).toBe(true);

      const invalid = { ...valid, state_version: 0 };
      expect(safeParseConversationState(invalid).success).toBe(false);
    });
  });

  describe('8. Persistence Abstraction: InMemory Repository', () => {
    it('saves and retrieves state by conversationId and externalUserId', async () => {
      const repo = new InMemoryConversationRepository();
      const state = createConversationState({
        conversation_id: 'c-repo-1',
        external_user_id: 'u-repo-1',
        channel: 'instagram',
      });

      await repo.save(state);
      expect(repo.count()).toBe(1);

      const byId = await repo.findById('c-repo-1');
      expect(byId).toEqual(state);

      const byUser = await repo.findByExternalUserId('instagram', 'u-repo-1');
      expect(byUser).toEqual(state);
    });

    it('preserves deep isolation and prevents mutation by reference', async () => {
      const repo = new InMemoryConversationRepository();
      const state = createConversationState({
        conversation_id: 'c-iso-1',
        external_user_id: 'u-iso-1',
      });

      await repo.save(state);
      const retrieved = await repo.findById('c-iso-1');
      expect(retrieved).not.toBeNull();

      // Mutate returned object
      retrieved!.quantity = 999;

      // Repository record remains intact
      const fresh = await repo.findById('c-iso-1');
      expect(fresh?.quantity).toBe(1);
    });

    it('enforces optimistic concurrency version check', async () => {
      const repo = new InMemoryConversationRepository();
      const state = createConversationState({
        conversation_id: 'c-occ-1',
        external_user_id: 'u-occ-1',
      });

      await repo.save(state); // version 1

      // Saving same or lower version throws
      await expect(repo.save({ ...state })).rejects.toThrow(/Optimistic concurrency violation/);

      // Incrementing version succeeds
      const next = reduceConversationState(state, {
        type: 'INTENT_IDENTIFIED',
        intent: 'price',
      });
      await expect(repo.save(next)).resolves.toBeDefined();
    });

    it('deletes conversation state and associated user index cleanly', async () => {
      const repo = new InMemoryConversationRepository();
      const state = createConversationState({
        conversation_id: 'c-del-1',
        external_user_id: 'u-del-1',
        channel: 'instagram',
      });

      await repo.save(state);
      expect(repo.count()).toBe(1);

      const deleted = await repo.delete('c-del-1');
      expect(deleted).toBe(true);
      expect(repo.count()).toBe(0);
      expect(await repo.findById('c-del-1')).toBeNull();
      expect(await repo.findByExternalUserId('instagram', 'u-del-1')).toBeNull();
    });
  });

  describe('9. ConversationService Application Orchestration', () => {
    it('creates or gets conversation state and applies transitions end-to-end', async () => {
      const repo = new InMemoryConversationRepository();
      const service = new ConversationService(repo);

      // getOrCreate creates new state
      const state1 = await service.getOrCreate('svc-conv-1', 'svc-user-1', 'instagram');
      expect(state1.state_version).toBe(1);

      // Subsequent getOrCreate returns existing
      const state1Again = await service.getOrCreate('svc-conv-1', 'svc-user-1', 'instagram');
      expect(state1Again.state_version).toBe(1);

      // Apply event increments version and saves
      const state2 = await service.applyEvent('svc-conv-1', {
        type: 'PRODUCT_SELECTED',
        productId: 'prod-hoodie-black',
        quantity: 1,
      });

      expect(state2.state_version).toBe(2);
      expect(state2.current_product_id).toBe('prod-hoodie-black');

      const retrieved = await service.getState('svc-conv-1');
      expect(retrieved?.state_version).toBe(2);

      // Check checkout readiness
      const readiness = await service.canCheckout('svc-conv-1');
      expect(readiness.canCheckout).toBe(false);
      expect(readiness.missing).toContain('delivery_method');
    });
  });
});
