import { normalizeSpanishRetailText } from './intent-normalizer';
import type {
  EscalationEvaluationInput,
  EscalationEvaluationResult,
  HandoffReason,
  HandoffSeverity,
} from './handoff-types';

/**
 * Priority definition for resolving multi-rule collisions.
 * Lower number = higher priority.
 */
export const HANDOFF_REASON_PRIORITIES: Record<HandoffReason, { priority: number; severity: HandoffSeverity }> = {
  safety_abuse: { priority: 1, severity: 'critical' },
  dependency_outage: { priority: 2, severity: 'critical' },
  dispute: { priority: 3, severity: 'high' },
  payment_issue: { priority: 4, severity: 'high' },
  refund_exchange_exception: { priority: 5, severity: 'medium' },
  explicit_human_request: { priority: 6, severity: 'medium' },
  repeated_low_confidence: { priority: 7, severity: 'low' },
  unsupported_request: { priority: 8, severity: 'low' },
  operator_intervention: { priority: 9, severity: 'medium' },
};

/**
 * Regex patterns for the 8 canonical escalation categories.
 */
export const ESCALATION_PATTERNS = {
  // 1. Explicit human request
  explicit_human_request: [
    /\b(?:(?:hablar|comunicarme?|contactar|ayuda)\s+con\s+(?:un\s+)?(?:humano|persona|asesor|agente|representante|alguien|operador|gerente))\b/i,
    /\b(?:persona\s+real|agente\s+humano|quiero\s+(?:un\s+)?humano|necesito\s+(?:un\s+)?humano)\b/i,
    /\b(?:atenci[oó]n\s+a\s+clientes|servicio\s+al\s+cliente|p[aá]same\s+(?:a|con)\s+(?:un\s+)?(?:asesor|humano|persona|agente)|p[aá]same\s+con\s+alguien)\b/i,
    /\b(?:talk\s+to\s+(?:a\s+)?(?:human|person|agent|representative|rep)|speak\s+to\s+(?:a\s+)?(?:human|person|agent)|human\s+please)\b/i,
    /\b(?:necesito\s+ayuda\s+de\s+una\s+persona|quiero\s+hablar\s+con\s+alguien\s+real)\b/i,
  ],

  // 3. Dispute (legal threats, PROFECO, chargeback, accusations of theft/scam)
  dispute: [
    /\b(?:profeco|abogad[oa]s?|demandar?|denunciar?|estafad?o?r?e?s?|fraude|ladrones|rateros|robo)\b/i,
    /\b(?:disputa|disputar|chargeback|contracargo|cargo\s+no\s+reconocido|reportar\s+al\s+banco|queja\s+formal)\b/i,
    /\b(?:lawsuit|lawyer|scam(?:mers?)?|stole\s+my\s+money|report\s+to\s+police|legal\s+action)\b/i,
    /\b(?:los\s+voy\s+a\s+demandar|voy\s+a\s+meter\s+queja|los\s+denunciare|son\s+unos\s+estafadores)\b/i,
  ],

  // 4. Refund / Return Exceptions (damaged, defective, policy exception)
  refund_exchange_exception: [
    /\b(?:lleg[oó]\s+(?:roto|rota|da[ñn]ad[oa]|manchad[oa]|abierto|incompleto))\b/i,
    /\b(?:prenda\s+(?:rota|manchada|defectuosa)|defecto\s+de\s+f[aá]brica|costura\s+(?:rota|descosida)|cierre\s+roto)\b/i,
    /\b(?:producto\s+(?:equivocado|incorrecto|da[ñn]ado)|no\s+es\s+lo\s+que\s+ped[ií]|paquete\s+abierto)\b/i,
    /\b(?:cambio\s+por\s+defecto|devoluci[oó]n\s+por\s+da[ñn]o|quiero\s+mi\s+dinero\s+de\s+vuelta|reembolso\s+inmediato)\b/i,
    /\b(?:excepci[oó]n\s+de\s+cambio|garant[ií]a\s+vencida|hacer\s+v[aá]lida\s+la\s+garant[ií]a)\b/i,
  ],

  // 5. Payment problems (declined card, double charge, spei proof verification, Stripe issues)
  payment_issue: [
    /\b(?:(?:tarjeta|pago)\s+(?:fue\s+)?rechazad[oa]|error\s+(?:al|en\s+el)\s+pago|no\s+pasa\s+(?:mi|la)\s+tarjeta)\b/i,
    /\b(?:me\s+cobraron\s+doble|doble\s+cargo|cargo\s+duplicado|spei\s+no\s+pasa)\b/i,
    /\b(?:comprobante\s+de\s+(?:transferencia|pago)|adjunto\s+(?:comprobante|recibo)|problema\s+con\s+el\s+pago)\b/i,
    /\b(?:(?:fall[oó]\s+el\s+pago|el\s+pago\s+fall[oó])|stripe|declined\s+card|payment\s+failed|double\s+charged)\b/i,
    /\b(?:no\s+me\s+acepta\s+el\s+pago|el\s+link\s+de\s+pago\s+marca\s+error|el\s+banco\s+bloque[oó]\s+la\s+compra)\b/i,
  ],

  // 6. Unsupported requests (bespoke tailoring, wholesale distribution, unserved countries, sponsorships)
  unsupported_request: [
    /\b(?:a\s+medida|personalizad[oa]s?|dise[ñn]o\s+exclusivo|confecci[oó]n\s+personalizada|hacen\s+arreglos|ajustes\s+a\s+medida)\b/i,
    /\b(?:precio\s+de\s+mayoreo|precios\s+por\s+mayor|comprar\s+por\s+mayoreo|distribuidor\s+autorizado|quiero\s+distribuir|quiero\s+revender)\b/i,
    /\b(?:env[ií]os?\s+a\s+(?:espa[ñn]a|colombia|argentina|chile|per[uú]|europa|estados\s+unidos|usa|rusia))\b/i,
    /\b(?:env[ií]an\s+a\s+(?:espa[ñn]a|colombia|argentina|chile|per[uú]|europa|sudam[eé]rica|latam|estados\s+unidos|usa|rusia))\b/i,
    /\b(?:patrocinio|colaboraci[oó]n|influencer\s+collab|acuerdo\s+comercial|franquicia)\b/i,
  ],

  // 7. Safety / Abuse (prompt injection, jailbreak, abusive harassment)
  safety_abuse: [
    /\b(?:ignore\s+(?:all\s+)?(?:previous\s+)?instructions|system\s+prompt|reveal\s+(?:your\s+)?instructions|jailbreak|dan\s+mode)\b/i,
    /\b(?:as\s+an\s+ai\s+language\s+model|bypass\s+rules|dame\s+tu\s+prompt|ignora\s+las\s+instrucciones)\b/i,
    /\b(?:chinga\s+tu\s+madre|hijo\s+de\s+puta|vete\s+a\s+la\s+mierda|est[uú]pido\s+bot|pinche\s+bot)\b/i,
  ],
};

const DEFAULT_MAX_CONSECUTIVE_UNKNOWNS = 3;

/**
 * Pure evaluation function that assesses customer utterances, routing results,
 * conversation history, and system context against the 8 escalation categories.
 */
export function evaluateHandoffRules(input: EscalationEvaluationInput): EscalationEvaluationResult {
  const norm = normalizeSpanishRetailText(input.currentMessage || '');
  const normalizedText = norm.normalizedText;
  const keyTriggers: string[] = [];

  const matchedReasons: Array<{
    reason: HandoffReason;
    severity: HandoffSeverity;
    priority: number;
    explanation: string;
    ruleName: string;
    trigger: string;
  }> = [];

  // -------------------------------------------------------------------------
  // Rule Category: safety_abuse
  // -------------------------------------------------------------------------
  if (norm.adversarialDetected) {
    matchedReasons.push({
      reason: 'safety_abuse',
      ...HANDOFF_REASON_PRIORITIES.safety_abuse,
      explanation: `Adversarial input detected: ${norm.adversarialReason || 'prompt_injection_pattern'}.`,
      ruleName: 'safety_abuse:adversarial_detection',
      trigger: norm.adversarialReason || 'adversarial_input',
    });
  }

  if (input.routingResult?.safety?.adversarialDetected) {
    matchedReasons.push({
      reason: 'safety_abuse',
      ...HANDOFF_REASON_PRIORITIES.safety_abuse,
      explanation: `Routing audit flagged adversarial content: ${input.routingResult.safety.adversarialReason || 'flagged'}.`,
      ruleName: 'safety_abuse:routing_audit',
      trigger: 'routing_adversarial_flag',
    });
  }

  for (const pattern of ESCALATION_PATTERNS.safety_abuse) {
    if (pattern.test(normalizedText) || pattern.test(input.currentMessage)) {
      matchedReasons.push({
        reason: 'safety_abuse',
        ...HANDOFF_REASON_PRIORITIES.safety_abuse,
        explanation: 'Customer utterance contains prompt injection, security bypass, or abusive language.',
        ruleName: `safety_abuse:${pattern.source}`,
        trigger: pattern.source,
      });
      break;
    }
  }

  // -------------------------------------------------------------------------
  // Rule Category: dependency_outage
  // -------------------------------------------------------------------------
  if (input.systemContext?.isDependencyDown) {
    const service = input.systemContext.outageService || 'critical_backend_service';
    matchedReasons.push({
      reason: 'dependency_outage',
      ...HANDOFF_REASON_PRIORITIES.dependency_outage,
      explanation: `Operational dependency outage detected: ${service} is unreachable or degraded.`,
      ruleName: 'dependency_outage:system_context',
      trigger: `outage:${service}`,
    });
  }

  if (input.systemContext?.dbError) {
    matchedReasons.push({
      reason: 'dependency_outage',
      ...HANDOFF_REASON_PRIORITIES.dependency_outage,
      explanation: `Database connection error: ${input.systemContext.dbError}`,
      ruleName: 'dependency_outage:db_error',
      trigger: 'db_error',
    });
  }

  // -------------------------------------------------------------------------
  // Rule Category: dispute
  // -------------------------------------------------------------------------
  if (input.history?.hasActiveDispute) {
    matchedReasons.push({
      reason: 'dispute',
      ...HANDOFF_REASON_PRIORITIES.dispute,
      explanation: 'Customer has an ongoing legal, PROFECO, or chargeback dispute.',
      ruleName: 'dispute:active_history',
      trigger: 'active_dispute_flag',
    });
  }

  for (const pattern of ESCALATION_PATTERNS.dispute) {
    if (pattern.test(normalizedText) || pattern.test(input.currentMessage)) {
      matchedReasons.push({
        reason: 'dispute',
        ...HANDOFF_REASON_PRIORITIES.dispute,
        explanation: 'Customer explicitly raised legal action, PROFECO, chargeback, or fraud accusation.',
        ruleName: `dispute:${pattern.source}`,
        trigger: pattern.source,
      });
      break;
    }
  }

  // -------------------------------------------------------------------------
  // Rule Category: payment_issue
  // -------------------------------------------------------------------------
  if (input.systemContext?.stripeError) {
    matchedReasons.push({
      reason: 'payment_issue',
      ...HANDOFF_REASON_PRIORITIES.payment_issue,
      explanation: `Stripe payment gateway reported an error: ${input.systemContext.stripeError}`,
      ruleName: 'payment_issue:stripe_error',
      trigger: 'stripe_gateway_error',
    });
  }

  for (const pattern of ESCALATION_PATTERNS.payment_issue) {
    if (pattern.test(normalizedText) || pattern.test(input.currentMessage)) {
      matchedReasons.push({
        reason: 'payment_issue',
        ...HANDOFF_REASON_PRIORITIES.payment_issue,
        explanation: 'Customer reported a payment decline, double charge, or submitted bank transfer proof.',
        ruleName: `payment_issue:${pattern.source}`,
        trigger: pattern.source,
      });
      break;
    }
  }

  // -------------------------------------------------------------------------
  // Rule Category: refund_exchange_exception
  // -------------------------------------------------------------------------
  for (const pattern of ESCALATION_PATTERNS.refund_exchange_exception) {
    if (pattern.test(normalizedText) || pattern.test(input.currentMessage)) {
      matchedReasons.push({
        reason: 'refund_exchange_exception',
        ...HANDOFF_REASON_PRIORITIES.refund_exchange_exception,
        explanation: 'Customer reported a damaged/defective garment or requested a policy exception return.',
        ruleName: `refund_exchange_exception:${pattern.source}`,
        trigger: pattern.source,
      });
      break;
    }
  }

  // -------------------------------------------------------------------------
  // Rule Category: explicit_human_request
  // -------------------------------------------------------------------------
  if (input.routingResult?.primaryIntent === 'human_help') {
    matchedReasons.push({
      reason: 'explicit_human_request',
      ...HANDOFF_REASON_PRIORITIES.explicit_human_request,
      explanation: 'Customer explicitly requested to speak with a human operator via canonical intent routing.',
      ruleName: 'explicit_human_request:intent_router',
      trigger: 'human_help_intent',
    });
  }

  for (const pattern of ESCALATION_PATTERNS.explicit_human_request) {
    if (pattern.test(normalizedText) || pattern.test(input.currentMessage)) {
      matchedReasons.push({
        reason: 'explicit_human_request',
        ...HANDOFF_REASON_PRIORITIES.explicit_human_request,
        explanation: 'Customer explicitly requested to communicate with a human agent.',
        ruleName: `explicit_human_request:${pattern.source}`,
        trigger: pattern.source,
      });
      break;
    }
  }

  // -------------------------------------------------------------------------
  // Rule Category: repeated_low_confidence
  // -------------------------------------------------------------------------
  const isCurrentUnknown = input.routingResult?.primaryIntent === 'unknown';
  const totalUnknowns = (input.history?.consecutiveUnknowns || 0) + (isCurrentUnknown ? 1 : 0);

  if (totalUnknowns >= DEFAULT_MAX_CONSECUTIVE_UNKNOWNS) {
    matchedReasons.push({
      reason: 'repeated_low_confidence',
      ...HANDOFF_REASON_PRIORITIES.repeated_low_confidence,
      explanation: `Reached threshold of ${totalUnknowns} consecutive unclassified or low-confidence customer turns.`,
      ruleName: 'repeated_low_confidence:threshold_reached',
      trigger: `consecutive_unknowns:${totalUnknowns}`,
    });
  }

  // -------------------------------------------------------------------------
  // Rule Category: unsupported_request
  // -------------------------------------------------------------------------
  for (const pattern of ESCALATION_PATTERNS.unsupported_request) {
    if (pattern.test(normalizedText) || pattern.test(input.currentMessage)) {
      matchedReasons.push({
        reason: 'unsupported_request',
        ...HANDOFF_REASON_PRIORITIES.unsupported_request,
        explanation: 'Customer requested bespoke tailoring, wholesale distribution, or unserved international shipping.',
        ruleName: `unsupported_request:${pattern.source}`,
        trigger: pattern.source,
      });
      break;
    }
  }

  // -------------------------------------------------------------------------
  // Conflict Resolution & Prioritization
  // -------------------------------------------------------------------------
  if (matchedReasons.length === 0) {
    return {
      shouldEscalate: false,
      reason: null,
      severity: null,
      explanation: 'Message conforms to automated dialogue boundaries.',
      keyTriggers: [],
    };
  }

  // Sort matched reasons by priority ascending (1 = highest priority)
  matchedReasons.sort((a, b) => a.priority - b.priority);
  const primaryMatch = matchedReasons[0];

  for (const m of matchedReasons) {
    if (!keyTriggers.includes(m.trigger)) {
      keyTriggers.push(m.trigger);
    }
  }

  return {
    shouldEscalate: true,
    reason: primaryMatch.reason,
    severity: primaryMatch.severity,
    explanation: primaryMatch.explanation,
    matchedRule: primaryMatch.ruleName,
    keyTriggers,
  };
}
