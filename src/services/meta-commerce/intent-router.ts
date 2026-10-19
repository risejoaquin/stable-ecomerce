import type { ConversationIntent, ConversationHandoffReason } from '../../types/meta-commerce';
import type {
  ExtractedEntities,
  HandoffEvaluation,
  IntentMatchDetail,
  IntentRouterOptions,
  IntentRoutingResult,
  IntentSafetyAudit,
} from './intent-types';
import { normalizeSpanishRetailText, type NormalizedInput } from './intent-normalizer';
import { RETAIL_INTENT_RULES, extractRetailEntities, type IntentRule } from './intent-rules';

const DEFAULT_CONFIDENCE_THRESHOLD = 0.65;
const DEFAULT_HANDOFF_CONFIDENCE_THRESHOLD = 0.40;
const DEFAULT_MAX_CONSECUTIVE_UNKNOWNS = 3;

/**
 * Pure function: Routes a Spanish customer utterance to a canonical retail intent.
 *
 * Invariants Enforced:
 * 1. Rule-based baseline: 100% deterministic, zero external AI/LLM network dependencies.
 * 2. Never hallucinate stock or price: returns safety metadata enforcing authoritative catalog verification.
 * 3. Never claim order created: downstream order service must confirm creation.
 * 4. Deterministic confidence scoring & fallback to 'unknown'.
 * 5. Immediate escalation on explicit human assistance request or safety abuse.
 */
export function routeSpanishRetailIntent(
  rawInput: string | null | undefined,
  options: IntentRouterOptions = {},
): IntentRoutingResult {
  const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const now = new Date().toISOString();

  // 1. Text Normalization & Adversarial Detection
  const norm: NormalizedInput = normalizeSpanishRetailText(rawInput);

  // 2. Universal Entity Extraction
  const entities: ExtractedEntities = extractRetailEntities(norm.normalizedText, norm.tokens);

  // 3. Handle Adversarial Input
  if (norm.adversarialDetected) {
    const safety: IntentSafetyAudit = {
      canDisclosePrice: false,
      canConfirmStock: false,
      canClaimOrderCreated: false,
      requiresBackendResolution: false,
      adversarialDetected: true,
      adversarialReason: norm.adversarialReason,
    };

    return {
      rawInput: norm.rawInput,
      normalizedText: norm.normalizedText,
      tokens: norm.tokens,
      primaryIntent: 'unknown',
      confidence: 0.0,
      isConfident: false,
      alternativeMatches: [],
      entities,
      handoffRequired: true,
      handoffReason: 'safety_abuse',
      safety,
      routedAt: now,
    };
  }

  // 4. Handle Empty or Trivial Inputs
  if (!norm.normalizedText || norm.tokens.length === 0) {
    const safety: IntentSafetyAudit = {
      canDisclosePrice: false,
      canConfirmStock: false,
      canClaimOrderCreated: false,
      requiresBackendResolution: false,
      adversarialDetected: false,
      adversarialReason: null,
    };

    return {
      rawInput: norm.rawInput,
      normalizedText: norm.normalizedText,
      tokens: norm.tokens,
      primaryIntent: 'unknown',
      confidence: 0.0,
      isConfident: false,
      alternativeMatches: [],
      entities,
      handoffRequired: false,
      handoffReason: null,
      safety,
      routedAt: now,
    };
  }

  // 5. Match Candidate Rules
  const matchedDetails: IntentMatchDetail[] = [];

  for (const rule of RETAIL_INTENT_RULES) {
    // 5a. Exact match check
    if (rule.exactMatches && rule.exactMatches.includes(norm.normalizedText)) {
      matchedDetails.push({
        intent: rule.intent,
        confidence: Math.min(1.0, rule.baseConfidence + 0.05),
        ruleName: `${rule.name}:exact`,
        matchedPattern: norm.normalizedText,
      });
      continue;
    }

    // 5b. Regex pattern checks
    for (const pattern of rule.patterns) {
      if (pattern.test(norm.normalizedText)) {
        let confidence = rule.baseConfidence;

        // Boost confidence if specific entities match intent context
        if (rule.intent === 'size' && entities.size) {
          confidence = Math.min(1.0, confidence + 0.04);
        } else if (rule.intent === 'color' && entities.color) {
          confidence = Math.min(1.0, confidence + 0.04);
        } else if (rule.intent === 'payment' && entities.paymentMethod) {
          confidence = Math.min(1.0, confidence + 0.04);
        } else if (rule.intent === 'shipping' && entities.shippingCity) {
          confidence = Math.min(1.0, confidence + 0.04);
        } else if (rule.intent === 'add_to_cart' && (entities.productMention || entities.quantity)) {
          confidence = Math.min(1.0, confidence + 0.04);
        }

        matchedDetails.push({
          intent: rule.intent,
          confidence,
          ruleName: rule.name,
          matchedPattern: pattern.source,
        });
        break; // Only match one pattern per rule
      }
    }
  }

  // 6. Intent Disambiguation & Priority Sorting
  let primaryIntent: ConversationIntent = 'unknown';
  let bestConfidence = 0.0;
  const alternatives: IntentMatchDetail[] = [];

  if (matchedDetails.length > 0) {
    // Sort matches by Rule Priority descending, then Confidence descending
    matchedDetails.sort((a, b) => {
      const ruleA = RETAIL_INTENT_RULES.find((r) => r.intent === a.intent);
      const ruleB = RETAIL_INTENT_RULES.find((r) => r.intent === b.intent);
      const priorityA = ruleA ? ruleA.priority : 0;
      const priorityB = ruleB ? ruleB.priority : 0;

      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      return b.confidence - a.confidence;
    });

    const topMatch = matchedDetails[0];

    // Special Disambiguation Case:
    // If shipping inquiry mentions cost ("cuanto cuesta el envio"), shipping rule has higher priority (65) than price (50).
    // If greeting is paired with actionable intent ("hola, precio?"), greeting priority is 20, price is 50 -> price wins!

    if (topMatch.confidence >= confidenceThreshold) {
      primaryIntent = topMatch.intent;
      bestConfidence = topMatch.confidence;
      alternatives.push(...matchedDetails.slice(1));
    } else {
      // Below threshold: fall back to unknown
      primaryIntent = 'unknown';
      bestConfidence = topMatch.confidence;
      alternatives.push(...matchedDetails);
    }
  }

  // 7. Determine Handoff Escalation
  let handoffRequired = false;
  let handoffReason: string | null = null;

  if (primaryIntent === 'human_help') {
    handoffRequired = true;
    handoffReason = 'explicit_human_request';
  }

  // 8. Construct Strict Retail Safety Audit
  const requiresBackendResolution = [
    'price',
    'availability',
    'size',
    'color',
    'shipping',
    'add_to_cart',
    'checkout',
    'order_status',
  ].includes(primaryIntent);

  const safety: IntentSafetyAudit = {
    canDisclosePrice: false,
    canConfirmStock: false,
    canClaimOrderCreated: false,
    requiresBackendResolution,
    adversarialDetected: false,
    adversarialReason: null,
  };

  return {
    rawInput: norm.rawInput,
    normalizedText: norm.normalizedText,
    tokens: norm.tokens,
    primaryIntent,
    confidence: Number(bestConfidence.toFixed(4)),
    isConfident: primaryIntent !== 'unknown' && bestConfidence >= confidenceThreshold,
    alternativeMatches: alternatives,
    entities,
    handoffRequired,
    handoffReason,
    safety,
    routedAt: now,
  };
}

/**
 * Evaluates whether a conversation requires human operator handoff based on routing results
 * and conversation history (e.g. repeated low confidence / repeated unknowns).
 */
export function evaluateHandoffRequirement(
  routingResult: IntentRoutingResult,
  history: {
    consecutiveUnknowns?: number;
    consecutiveLowConfidence?: number;
    hasActiveDispute?: boolean;
  } = {},
  options: IntentRouterOptions = {},
): HandoffEvaluation {
  const maxUnknowns = options.maxConsecutiveUnknowns ?? DEFAULT_MAX_CONSECUTIVE_UNKNOWNS;
  const handoffConfidenceThreshold = options.handoffConfidenceThreshold ?? DEFAULT_HANDOFF_CONFIDENCE_THRESHOLD;

  // 1. Explicit Human Request
  if (routingResult.primaryIntent === 'human_help') {
    return {
      handoffRequired: true,
      reason: 'explicit_human_request',
      notes: 'Customer explicitly requested assistance from a human operator.',
    };
  }

  // 2. Safety / Adversarial Abuse
  if (routingResult.safety.adversarialDetected) {
    return {
      handoffRequired: true,
      reason: 'safety_abuse',
      notes: `Safety invariant triggered: ${routingResult.safety.adversarialReason || 'adversarial_input_detected'}.`,
    };
  }

  // 3. Active Dispute or Return/Exchange Exception
  if (history.hasActiveDispute || routingResult.primaryIntent === 'return_exchange') {
    // Return or exchange inquiries can be evaluated for operator review if complex
    return {
      handoffRequired: false,
      reason: null,
      notes: 'Return or exchange inquiry detected; ready for policy presentation or manual operator review.',
    };
  }

  // 4. Repeated Low Confidence / Fallback Unknowns
  const currentConsecutiveUnknowns = (history.consecutiveUnknowns ?? 0) + (routingResult.primaryIntent === 'unknown' ? 1 : 0);
  if (currentConsecutiveUnknowns >= maxUnknowns) {
    return {
      handoffRequired: true,
      reason: 'repeated_low_confidence',
      notes: `Triggered handoff after ${currentConsecutiveUnknowns} consecutive unclassified or low-confidence messages.`,
    };
  }

  // 5. Very low confidence below critical floor
  if (routingResult.primaryIntent === 'unknown' && routingResult.confidence > 0 && routingResult.confidence < handoffConfidenceThreshold) {
    // Low confidence tracked
    return {
      handoffRequired: false,
      reason: null,
      notes: `Low confidence message (${routingResult.confidence} < ${handoffConfidenceThreshold}), incrementing fallback counter.`,
    };
  }

  return {
    handoffRequired: false,
    reason: null,
    notes: 'Conversation remains within automated routing bounds.',
  };
}

/**
 * State-aware Intent Router class that can be integrated into conversation services.
 */
export class IntentRouter {
  private readonly options: IntentRouterOptions;

  constructor(options: IntentRouterOptions = {}) {
    this.options = {
      confidenceThreshold: options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      handoffConfidenceThreshold: options.handoffConfidenceThreshold ?? DEFAULT_HANDOFF_CONFIDENCE_THRESHOLD,
      maxConsecutiveUnknowns: options.maxConsecutiveUnknowns ?? DEFAULT_MAX_CONSECUTIVE_UNKNOWNS,
    };
  }

  /**
   * Routes a message utterance to its canonical intent.
   */
  route(text: string | null | undefined): IntentRoutingResult {
    return routeSpanishRetailIntent(text, this.options);
  }

  /**
   * Evaluates if conversation needs handoff.
   */
  evaluateHandoff(
    result: IntentRoutingResult,
    history?: {
      consecutiveUnknowns?: number;
      consecutiveLowConfidence?: number;
      hasActiveDispute?: boolean;
    },
  ): HandoffEvaluation {
    return evaluateHandoffRequirement(result, history, this.options);
  }
}
