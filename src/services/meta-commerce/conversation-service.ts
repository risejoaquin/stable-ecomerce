import type {
  ConversationState,
  ConversationDomainEvent,
  CreateConversationParams,
} from '../../types/meta-commerce';
import {
  createConversationState,
  reduceConversationState,
  canProceedToCheckout,
  type CheckoutReadiness,
} from './conversation-domain';
import type { ConversationRepository } from './conversation-repository';
import { routeSpanishRetailIntent } from './intent-router';
import type { IntentRouterOptions, IntentRoutingResult } from './intent-types';

export class ConversationService {
  constructor(private readonly repository: ConversationRepository) {}

  /**
   * Retrieves an existing conversation state, or creates an initial one if not found.
   */
  async getOrCreate(
    conversationId: string,
    externalUserId: string,
    channel: string = 'instagram',
    metadata?: Record<string, unknown>,
  ): Promise<ConversationState> {
    const existing = await this.repository.findById(conversationId);
    if (existing) {
      return existing;
    }

    const initial = createConversationState({
      conversation_id: conversationId,
      external_user_id: externalUserId,
      channel,
      metadata,
    });

    return this.repository.save(initial);
  }

  /**
   * Retrieves current conversation state by conversation ID.
   */
  async getState(conversationId: string): Promise<ConversationState | null> {
    return this.repository.findById(conversationId);
  }

  /**
   * Retrieves current conversation state by external user ID.
   */
  async getByExternalUserId(channel: string, externalUserId: string): Promise<ConversationState | null> {
    return this.repository.findByExternalUserId(channel, externalUserId);
  }

  /**
   * Applies a domain event to an existing conversation state and persists the resulting state.
   */
  async applyEvent(conversationId: string, event: ConversationDomainEvent): Promise<ConversationState> {
    const current = await this.repository.findById(conversationId);
    if (!current) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const next = reduceConversationState(current, event);
    return this.repository.save(next);
  }

  /**
   * Directly saves a valid conversation state.
   */
  async saveState(state: ConversationState): Promise<ConversationState> {
    return this.repository.save(state);
  }

  /**
   * Evaluates if the current conversation is ready to proceed to checkout.
   */
  async canCheckout(conversationId: string): Promise<CheckoutReadiness> {
    const state = await this.repository.findById(conversationId);
    if (!state) {
      return {
        canCheckout: false,
        missing: ['product'],
        reasons: [`Conversation not found: ${conversationId}`],
      };
    }

    return canProceedToCheckout(state);
  }

  /**
   * Routes an inbound customer message using deterministic Spanish retail rules,
   * updates the conversation state with the detected intent, and returns both state and routing result.
   */
  async routeAndApplyInboundMessage(
    conversationId: string,
    text: string,
    options?: IntentRouterOptions,
  ): Promise<{ state: ConversationState; routing: IntentRoutingResult }> {
    const current = await this.repository.findById(conversationId);
    if (!current) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const routing = routeSpanishRetailIntent(text, options);

    let updatedState = reduceConversationState(current, {
      type: 'INBOUND_MESSAGE_RECEIVED',
      text,
      detectedIntent: routing.primaryIntent,
    });

    if (routing.handoffRequired && routing.handoffReason) {
      updatedState = reduceConversationState(updatedState, {
        type: 'HANDOFF_TRIGGERED',
        reason: routing.handoffReason,
      });
    }

    const saved = await this.repository.save(updatedState);
    return { state: saved, routing };
  }
}
