import type { ConversationState } from '../../types/meta-commerce';
import {
  reduceConversationState,
  isConversationHandoffActive,
} from './conversation-domain';
import type { ConversationRepository } from './conversation-repository';
import type { HandoffTicketRepository } from './handoff-repository';
import { InMemoryHandoffRepository } from './handoff-repository';
import { evaluateHandoffRules, HANDOFF_REASON_PRIORITIES } from './handoff-rules';
import {
  buildSafeConversationSummary,
  buildSafeTranscript,
  sanitizeMessageText,
} from './handoff-sanitizer';
import type {
  CloseOptions,
  EscalateOptions,
  EscalationEvaluationInput,
  EscalationEvaluationResult,
  HandoffMessage,
  HandoffReason,
  HandoffSender,
  HandoffStatus,
  HandoffTicket,
  ResumeOptions,
  SafeConversationSummary,
  SafeTranscript,
} from './handoff-types';

export class HumanHandoffService {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly handoffRepo: HandoffTicketRepository = new InMemoryHandoffRepository(),
  ) {}

  /**
   * Pure evaluation of an incoming message and contextual state against the 8 canonical handoff rules.
   */
  evaluate(input: EscalationEvaluationInput): EscalationEvaluationResult {
    return evaluateHandoffRules(input);
  }

  /**
   * Escalates a single conversation to human operator care.
   *
   * Invariant: Blocks ONLY the affected conversation (identified by conversationId).
   * All other parallel conversations remain 100% active and unblocked.
   */
  async escalate(
    conversationId: string,
    reason: HandoffReason,
    options?: EscalateOptions,
  ): Promise<{ state: ConversationState; ticket: HandoffTicket }> {
    const currentState = await this.conversationRepo.findById(conversationId);
    if (!currentState) {
      throw new Error(`Cannot escalate non-existent conversation: ${conversationId}`);
    }

    const now = new Date().toISOString();
    const severityConfig = HANDOFF_REASON_PRIORITIES[reason] || { priority: 9, severity: 'medium' };

    // 1. Update Conversation Domain State
    // Transition conversation state into handoff mode using the domain reducer
    let nextState = currentState;
    if (!currentState.handoff_required || currentState.handoff_reason !== reason) {
      nextState = reduceConversationState(currentState, {
        type: 'HANDOFF_TRIGGERED',
        reason,
        timestamp: now,
      });
      nextState = await this.conversationRepo.save(nextState);
    }

    // 2. Fetch or initialize existing ticket & message history
    const existingTicket = await this.handoffRepo.findByConversationId(conversationId);

    // Collect pre-existing messages from ticket transcript if any
    const existingMessages = existingTicket?.transcript?.messages || [];

    // 3. Assemble Safe Transcript (Strict PII Sanitization)
    const transcript: SafeTranscript = buildSafeTranscript({
      conversationId,
      channel: nextState.channel,
      externalUserId: nextState.external_user_id,
      messages: existingMessages,
      startedAt: existingTicket?.transcript?.startedAt || nextState.created_at || now,
      escalatedAt: now,
    });

    // 4. Assemble Safe Executive Summary for Operator
    const summary: SafeConversationSummary = buildSafeConversationSummary({
      conversationId,
      reason,
      severity: severityConfig.severity,
      state: nextState,
      keyTriggers: existingTicket?.summary?.keyTriggers || [reason],
      explanation: options?.customReasonExplanation,
      turnCount: nextState.state_version,
      lowConfidenceCount: existingTicket?.summary?.lowConfidenceCount || 0,
    });

    // 5. Construct and Persist Handoff Ticket
    const ticketId = existingTicket?.ticketId || `ticket-${conversationId}-${Date.now()}`;
    const ticket: HandoffTicket = {
      ticketId,
      conversationId,
      status: 'pending',
      reason,
      severity: severityConfig.severity,
      createdAt: existingTicket?.createdAt || now,
      updatedAt: now,
      assignedOperatorId: options?.operatorId || existingTicket?.assignedOperatorId || null,
      assignedAt: options?.operatorId ? now : existingTicket?.assignedAt || null,
      resolvedAt: null,
      closedAt: null,
      resolutionNotes: null,
      summary,
      transcript,
      metadata: options?.metadata ? { ...options.metadata } : existingTicket?.metadata || {},
    };

    const savedTicket = await this.handoffRepo.save(ticket);
    return { state: nextState, ticket: savedTicket };
  }

  /**
   * Appends an inbound or outbound message to the conversation transcript,
   * scrubbing all PII immediately upon ingestion so sensitive data is never persisted.
   */
  async recordMessage(
    conversationId: string,
    sender: HandoffSender,
    text: string,
    metadata?: Record<string, unknown>,
  ): Promise<HandoffMessage> {
    const ticket = await this.handoffRepo.findByConversationId(conversationId);
    const now = new Date().toISOString();

    const { sanitized } = sanitizeMessageText(text);
    const msgId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const message: HandoffMessage = {
      id: msgId,
      conversationId,
      sender,
      sanitizedText: sanitized,
      timestamp: now,
      metadata,
    };

    if (ticket) {
      ticket.transcript.messages.push(message);
      ticket.transcript.messageCount = ticket.transcript.messages.length;
      ticket.updatedAt = now;
      await this.handoffRepo.save(ticket);
    }

    return message;
  }

  /**
   * Assigns an operator to a pending handoff ticket.
   */
  async assignOperator(conversationId: string, operatorId: string): Promise<HandoffTicket> {
    if (!operatorId || !operatorId.trim()) {
      throw new Error('operatorId is required to assign a ticket');
    }

    const ticket = await this.handoffRepo.findByConversationId(conversationId);
    if (!ticket) {
      throw new Error(`No handoff ticket found for conversation: ${conversationId}`);
    }

    const now = new Date().toISOString();
    ticket.assignedOperatorId = operatorId.trim();
    ticket.assignedAt = now;
    ticket.status = 'in_progress';
    ticket.updatedAt = now;

    return this.handoffRepo.save(ticket);
  }

  /**
   * Operator resumes automated bot processing for the affected conversation.
   *
   * Unblocks the conversation by applying HANDOFF_RESOLVED to its domain state,
   * clearing handoff_required and handoff_reason.
   */
  async resumeConversation(
    conversationId: string,
    options: ResumeOptions,
  ): Promise<{ state: ConversationState; ticket: HandoffTicket }> {
    const currentState = await this.conversationRepo.findById(conversationId);
    if (!currentState) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const ticket = await this.handoffRepo.findByConversationId(conversationId);
    if (!ticket) {
      throw new Error(`No handoff ticket found for conversation: ${conversationId}`);
    }

    const now = new Date().toISOString();
    const notes = options.notes || 'Handoff resolved by operator; bot resumed.';

    // 1. Unblock Domain State via HANDOFF_RESOLVED event
    let nextState = reduceConversationState(currentState, {
      type: 'HANDOFF_RESOLVED',
      resolutionNotes: notes,
      timestamp: now,
    });

    if (options.newIntent) {
      nextState = reduceConversationState(nextState, {
        type: 'INTENT_IDENTIFIED',
        intent: options.newIntent,
        timestamp: now,
      });
    }

    nextState = await this.conversationRepo.save(nextState);

    // 2. Update Ticket to resumed
    ticket.status = 'resumed';
    ticket.resolvedAt = now;
    ticket.resolutionNotes = notes;
    ticket.updatedAt = now;
    if (options.operatorId) {
      ticket.assignedOperatorId = options.operatorId;
    }

    const savedTicket = await this.handoffRepo.save(ticket);
    return { state: nextState, ticket: savedTicket };
  }

  /**
   * Operator permanently closes the handoff ticket.
   * Optionally resets conversation state.
   */
  async closeConversation(
    conversationId: string,
    options: CloseOptions,
  ): Promise<{ state: ConversationState; ticket: HandoffTicket }> {
    const currentState = await this.conversationRepo.findById(conversationId);
    if (!currentState) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    const ticket = await this.handoffRepo.findByConversationId(conversationId);
    if (!ticket) {
      throw new Error(`No handoff ticket found for conversation: ${conversationId}`);
    }

    const now = new Date().toISOString();
    const notes = options.notes || 'Handoff ticket closed by operator.';

    let nextState = currentState;

    // If conversation was still blocked, resolve handoff first
    if (nextState.handoff_required) {
      nextState = reduceConversationState(nextState, {
        type: 'HANDOFF_RESOLVED',
        resolutionNotes: notes,
        timestamp: now,
      });
    }

    // Optional state reset if customer transaction ended
    if (options.resetConversation) {
      nextState = reduceConversationState(nextState, {
        type: 'STATE_RESET',
        preserveCustomer: true,
        timestamp: now,
      });
    }

    nextState = await this.conversationRepo.save(nextState);

    ticket.status = 'closed';
    ticket.closedAt = now;
    ticket.resolutionNotes = notes;
    ticket.updatedAt = now;
    if (options.operatorId) {
      ticket.assignedOperatorId = options.operatorId;
    }

    const savedTicket = await this.handoffRepo.save(ticket);
    return { state: nextState, ticket: savedTicket };
  }

  /**
   * Checks whether a specific conversation is currently blocked by handoff.
   */
  async isConversationBlocked(conversationId: string): Promise<boolean> {
    const state = await this.conversationRepo.findById(conversationId);
    if (!state) return false;
    return isConversationHandoffActive(state);
  }

  /**
   * Retrieves an existing ticket by conversation ID.
   */
  async getTicket(conversationId: string): Promise<HandoffTicket | null> {
    return this.handoffRepo.findByConversationId(conversationId);
  }

  /**
   * Lists all pending handoff tickets requiring human operator action.
   */
  async listPendingTickets(): Promise<HandoffTicket[]> {
    return this.handoffRepo.list({ status: 'pending' });
  }

  /**
   * Lists tickets with optional status, reason, and operator filtering.
   */
  async listTickets(filter?: {
    status?: HandoffStatus;
    reason?: HandoffReason;
    operatorId?: string;
  }): Promise<HandoffTicket[]> {
    return this.handoffRepo.list(filter);
  }

  /**
   * Retrieves the safe, sanitized conversation summary for operator display.
   */
  async getSafeSummary(conversationId: string): Promise<SafeConversationSummary | null> {
    const ticket = await this.handoffRepo.findByConversationId(conversationId);
    return ticket ? ticket.summary : null;
  }

  /**
   * Retrieves the safe, sanitized conversation transcript for operator display.
   */
  async getSafeTranscript(conversationId: string): Promise<SafeTranscript | null> {
    const ticket = await this.handoffRepo.findByConversationId(conversationId);
    return ticket ? ticket.transcript : null;
  }
}
