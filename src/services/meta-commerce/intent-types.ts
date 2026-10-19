import { z } from 'zod';
import {
  type ConversationIntent,
  type ConversationHandoffReason,
  ConversationIntentSchema,
} from '../../types/meta-commerce';

/**
 * Extracted entities and slots from customer utterance.
 */
export const ExtractedEntitiesSchema = z.object({
  size: z.string().nullable().default(null),
  color: z.string().nullable().default(null),
  quantity: z.number().int().min(1).nullable().default(null),
  paymentMethod: z.string().nullable().default(null),
  shippingCity: z.string().nullable().default(null),
  productMention: z.string().nullable().default(null),
  rawEntities: z.record(z.string(), z.unknown()).optional(),
});
export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;

/**
 * Diagnostic match details for each matched candidate rule.
 */
export const IntentMatchDetailSchema = z.object({
  intent: ConversationIntentSchema,
  confidence: z.number().min(0).max(1),
  ruleName: z.string(),
  matchedPattern: z.string(),
  extractedSlot: z.record(z.string(), z.string()).optional(),
});
export type IntentMatchDetail = z.infer<typeof IntentMatchDetailSchema>;

/**
 * Retail safety audit metadata guaranteeing zero hallucinations and order safety invariants.
 */
export const IntentSafetyAuditSchema = z.object({
  /**
   * Price can NEVER be generated or hallucinated by the intent layer.
   * Authoritative price retrieval must come from the catalog backend.
   */
  canDisclosePrice: z.literal(false).default(false),

  /**
   * Stock/inventory status can NEVER be hallucinated by the intent layer.
   * Real-time availability must be verified by the catalog/stock backend.
   */
  canConfirmStock: z.literal(false).default(false),

  /**
   * An order can NEVER be claimed created before backend confirmation.
   * Downstream order service must explicitly generate and confirm the draft.
   */
  canClaimOrderCreated: z.literal(false).default(false),

  /**
   * Indicates whether downstream fulfillment/catalog lookup is required for this intent.
   */
  requiresBackendResolution: z.boolean(),

  /**
   * Flag indicating whether adversarial prompt injection or injection attempt was detected.
   */
  adversarialDetected: z.boolean().default(false),

  /**
   * Explanation if adversarial input was detected.
   */
  adversarialReason: z.string().nullable().default(null),
});
export type IntentSafetyAudit = z.infer<typeof IntentSafetyAuditSchema>;

/**
 * Full deterministic intent routing result.
 */
export const IntentRoutingResultSchema = z.object({
  rawInput: z.string(),
  normalizedText: z.string(),
  tokens: z.array(z.string()),
  primaryIntent: ConversationIntentSchema,
  confidence: z.number().min(0).max(1),
  isConfident: z.boolean(),
  alternativeMatches: z.array(IntentMatchDetailSchema),
  entities: ExtractedEntitiesSchema,
  handoffRequired: z.boolean(),
  handoffReason: z.string().nullable(),
  safety: IntentSafetyAuditSchema,
  routedAt: z.string(),
});
export type IntentRoutingResult = z.infer<typeof IntentRoutingResultSchema>;

/**
 * Configuration options for the intent router.
 */
export interface IntentRouterOptions {
  /**
   * Minimum confidence score (0.0 - 1.0) required to accept a non-unknown intent.
   * Below this threshold, intent automatically falls back to 'unknown'.
   * Default: 0.65
   */
  confidenceThreshold?: number;

  /**
   * Confidence threshold below which conversation handoff may be triggered.
   * Default: 0.40
   */
  handoffConfidenceThreshold?: number;

  /**
   * Maximum consecutive unknown utterances allowed before escalating to human agent.
   * Default: 3
   */
  maxConsecutiveUnknowns?: number;
}

/**
 * Evaluation of human handoff requirements.
 */
export interface HandoffEvaluation {
  handoffRequired: boolean;
  reason: ConversationHandoffReason | null;
  notes: string;
}
