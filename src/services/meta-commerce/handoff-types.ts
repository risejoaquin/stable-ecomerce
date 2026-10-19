import { z } from 'zod';
import type { ConversationIntent, ConversationState } from '../../types/meta-commerce';
import type { IntentRoutingResult } from './intent-types';

/**
 * 8 Canonical Escalation Reasons (+ manual operator intervention)
 * mandated by AG-HANDOFF specifications.
 */
export const HANDOFF_REASONS = [
  'explicit_human_request',
  'repeated_low_confidence',
  'dispute',
  'refund_exchange_exception',
  'payment_issue',
  'unsupported_request',
  'safety_abuse',
  'dependency_outage',
  'operator_intervention',
] as const;

export const HandoffReasonSchema = z.enum(HANDOFF_REASONS);
export type HandoffReason = z.infer<typeof HandoffReasonSchema>;

/**
 * Severity rating for triaging operator attention.
 */
export const HandoffSeveritySchema = z.enum([
  'critical',
  'high',
  'medium',
  'low',
]);
export type HandoffSeverity = z.infer<typeof HandoffSeveritySchema>;

/**
 * Lifecycle states of an escalated handoff ticket.
 */
export const HandoffStatusSchema = z.enum([
  'pending',
  'assigned',
  'in_progress',
  'resumed',
  'closed',
]);
export type HandoffStatus = z.infer<typeof HandoffStatusSchema>;

/**
 * Message participant role.
 */
export const HandoffSenderSchema = z.enum(['customer', 'bot', 'operator']);
export type HandoffSender = z.infer<typeof HandoffSenderSchema>;

/**
 * Sanitized, PII-safe message record within an escalation transcript.
 */
export const HandoffMessageSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  sender: HandoffSenderSchema,
  sanitizedText: z.string(),
  timestamp: z.string(),
  intent: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type HandoffMessage = z.infer<typeof HandoffMessageSchema>;

/**
 * Safe, PII-scrubbed historical conversation transcript.
 */
export const SafeTranscriptSchema = z.object({
  conversationId: z.string().min(1),
  channel: z.string().default('instagram'),
  maskedExternalUserId: z.string(),
  messageCount: z.number().int().min(0),
  messages: z.array(HandoffMessageSchema),
  startedAt: z.string(),
  escalatedAt: z.string(),
});
export type SafeTranscript = z.infer<typeof SafeTranscriptSchema>;

/**
 * Executive briefing for human operator containing commerce context without PII exposure.
 */
export const SafeConversationSummarySchema = z.object({
  conversationId: z.string().min(1),
  reason: HandoffReasonSchema,
  severity: HandoffSeveritySchema,
  executiveSummary: z.string(),
  currentProduct: z
    .object({
      id: z.string(),
      name: z.string().optional(),
      variantId: z.string().nullable().optional(),
      quantity: z.number().int().min(1),
    })
    .nullable(),
  currentOrderDraftId: z.string().nullable(),
  deliveryMethod: z.string().nullable(),
  paymentMethod: z.string().nullable(),
  shippingCityState: z.string().nullable(),
  customerContactMasked: z
    .object({
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
    })
    .nullable(),
  keyTriggers: z.array(z.string()),
  turnCount: z.number().int().min(0),
  lowConfidenceCount: z.number().int().min(0),
});
export type SafeConversationSummary = z.infer<typeof SafeConversationSummarySchema>;

/**
 * Full operator handoff ticket model.
 */
export const HandoffTicketSchema = z.object({
  ticketId: z.string().min(1),
  conversationId: z.string().min(1),
  status: HandoffStatusSchema,
  reason: HandoffReasonSchema,
  severity: HandoffSeveritySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  assignedOperatorId: z.string().nullable(),
  assignedAt: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  closedAt: z.string().nullable(),
  resolutionNotes: z.string().nullable(),
  summary: SafeConversationSummarySchema,
  transcript: SafeTranscriptSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type HandoffTicket = z.infer<typeof HandoffTicketSchema>;

/**
 * Input for evaluating whether an inbound message or system condition requires escalation.
 */
export interface EscalationEvaluationInput {
  conversationId: string;
  currentMessage: string;
  conversationState?: ConversationState | null;
  routingResult?: IntentRoutingResult | null;
  history?: {
    messages?: Array<{
      sender: HandoffSender;
      text: string;
      timestamp?: string;
      intent?: string;
    }>;
    consecutiveUnknowns?: number;
    consecutiveLowConfidence?: number;
    hasActiveDispute?: boolean;
  };
  systemContext?: {
    isDependencyDown?: boolean;
    outageService?: string;
    stripeError?: string;
    dbError?: string;
  };
}

/**
 * Deterministic result of escalation rule evaluation.
 */
export interface EscalationEvaluationResult {
  shouldEscalate: boolean;
  reason: HandoffReason | null;
  severity: HandoffSeverity | null;
  explanation: string;
  matchedRule?: string;
  keyTriggers: string[];
}

/**
 * Options for triggering escalation.
 */
export interface EscalateOptions {
  operatorId?: string;
  customReasonExplanation?: string;
  systemContext?: EscalationEvaluationInput['systemContext'];
  metadata?: Record<string, unknown>;
}

/**
 * Options for resuming automated handling.
 */
export interface ResumeOptions {
  operatorId: string;
  notes?: string;
  newIntent?: ConversationIntent;
  metadata?: Record<string, unknown>;
}

/**
 * Options for closing the handoff ticket.
 */
export interface CloseOptions {
  operatorId: string;
  notes?: string;
  resetConversation?: boolean;
  metadata?: Record<string, unknown>;
}
