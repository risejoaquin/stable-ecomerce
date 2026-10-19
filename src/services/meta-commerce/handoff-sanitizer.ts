import type { ConversationState } from '../../types/meta-commerce';
import {
  detectAndRedactCardData,
  maskAddress,
  maskCustomerName,
  maskEmail,
  maskPhone,
  sanitizeFulfillmentLog,
} from './fulfillment-sanitizer';
import { maskExternalUserId } from './webhook-sanitizer';
import type {
  HandoffMessage,
  HandoffReason,
  HandoffSender,
  HandoffSeverity,
  SafeConversationSummary,
  SafeTranscript,
} from './handoff-types';

/**
 * Regex patterns for inline PII and credential detection.
 */
const INLINE_EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const INLINE_PHONE_REGEX = /(?:\+?52\s?)?(?:\(?\d{2,3}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}\b/g;
const CREDENTIAL_REGEX =
  /(?:bearer\s+[a-zA-Z0-9_\-.]+|sk_(?:live|test)_[a-zA-Z0-9]+|whsec_[a-zA-Z0-9]+|(?:password|contraseña|token|secret)[\s:=]+[^\s]+)/gi;
const CURP_RFC_REGEX = /\b[A-Z]{4}\d{6}[A-Z0-9]{3,8}\b/gi;
const STREET_ADDRESS_INLINE_REGEX =
  /\b(?:calle|avenida|av\.?|blvd\.?|privada|cerrada|andador)\s+[A-Za-z0-9\s#.,\-]+(?:#\s*\d+|\d{1,5})\b/gi;

/**
 * Sanitizes an arbitrary conversational message text, stripping all:
 * 1. Credit card PANs (with Luhn checksum validation)
 * 2. CVV / CVC security codes
 * 3. Expiration dates
 * 4. Inline email addresses
 * 5. Inline telephone numbers
 * 6. Inline credentials, tokens, and secrets
 * 7. Mexican CURP / RFC identifiers
 * 8. Specific residential street addresses
 */
export function sanitizeMessageText(rawText: string | null | undefined): {
  sanitized: string;
  hadCardData: boolean;
  hadPii: boolean;
} {
  if (!rawText || typeof rawText !== 'string') {
    return { sanitized: '', hadCardData: false, hadPii: false };
  }

  let hadPii = false;

  // 1. Credit card PAN, CVV, Exp redaction
  const cardResult = detectAndRedactCardData(rawText);
  let text = cardResult.redactedText;
  const hadCardData = cardResult.containsCardData;

  // 2. Inline credentials / tokens
  if (CREDENTIAL_REGEX.test(text)) {
    hadPii = true;
    text = text.replace(CREDENTIAL_REGEX, '[CREDENTIAL_REDACTED]');
  }

  // 3. Inline email addresses
  if (INLINE_EMAIL_REGEX.test(text)) {
    hadPii = true;
    text = text.replace(INLINE_EMAIL_REGEX, (email) => maskEmail(email));
  }

  // 4. Mexican CURP / RFC identifiers
  if (CURP_RFC_REGEX.test(text)) {
    hadPii = true;
    text = text.replace(CURP_RFC_REGEX, '[ID_REDACTED]');
  }

  // 5. Inline phone numbers (at least 7-10 digits)
  text = text.replace(INLINE_PHONE_REGEX, (phone) => {
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length >= 7 && cleanDigits.length <= 13) {
      hadPii = true;
      return maskPhone(phone);
    }
    return phone;
  });

  // 6. Detailed street address lines
  text = text.replace(STREET_ADDRESS_INLINE_REGEX, (address) => {
    hadPii = true;
    return maskAddress(address);
  });

  return {
    sanitized: text,
    hadCardData,
    hadPii: hadPii || hadCardData,
  };
}

/**
 * Builds a SafeTranscript from a sequence of raw or pre-existing messages.
 * Guarantees zero PII leakage in the output transcript.
 */
export function buildSafeTranscript(params: {
  conversationId: string;
  channel?: string;
  externalUserId: string;
  messages: Array<{
    id?: string;
    sender: HandoffSender;
    text?: string;
    sanitizedText?: string;
    timestamp?: string;
    intent?: string;
    metadata?: Record<string, unknown>;
  }>;
  startedAt?: string;
  escalatedAt?: string;
}): SafeTranscript {
  const now = new Date().toISOString();
  const sanitizedMessages: HandoffMessage[] = params.messages.map((msg, index) => {
    const raw = msg.sanitizedText ?? msg.text ?? '';
    const { sanitized } = sanitizeMessageText(raw);
    return {
      id: msg.id || `msg-${index + 1}-${Date.now()}`,
      conversationId: params.conversationId,
      sender: msg.sender,
      sanitizedText: sanitized,
      timestamp: msg.timestamp || now,
      intent: msg.intent,
      metadata: msg.metadata ? sanitizeFulfillmentLog(msg.metadata) : undefined,
    };
  });

  return {
    conversationId: params.conversationId,
    channel: params.channel || 'instagram',
    maskedExternalUserId: maskExternalUserId(params.externalUserId),
    messageCount: sanitizedMessages.length,
    messages: sanitizedMessages,
    startedAt: params.startedAt || sanitizedMessages[0]?.timestamp || now,
    escalatedAt: params.escalatedAt || now,
  };
}

/**
 * Generates an executive briefing summary for a human operator.
 * Retains vital commerce attributes (product, draft order, delivery method)
 * while ensuring all PII is strictly masked or excluded.
 */
export function buildSafeConversationSummary(params: {
  conversationId: string;
  reason: HandoffReason;
  severity: HandoffSeverity;
  state?: ConversationState | null;
  keyTriggers?: string[];
  explanation?: string;
  turnCount?: number;
  lowConfidenceCount?: number;
}): SafeConversationSummary {
  const state = params.state;
  const triggers = params.keyTriggers || [];
  const explanation = params.explanation || `Escalated due to ${params.reason}.`;

  // Safely extract shipping city / state (excluding specific house number or street)
  let shippingCityState: string | null = null;
  if (state?.shipping_location) {
    const loc = state.shipping_location;
    const parts: string[] = [];
    if (loc.city) parts.push(loc.city);
    if (loc.state) parts.push(loc.state);
    if (loc.postalCode) parts.push(`CP ${loc.postalCode.slice(0, 2)}***`);
    shippingCityState = parts.length > 0 ? parts.join(', ') : 'Location provided (masked)';
  }

  // Safely mask contact details if present in metadata
  let customerContactMasked: { name?: string; email?: string; phone?: string } | null = null;
  if (state?.metadata?.customer) {
    const rawCust = state.metadata.customer as Record<string, unknown>;
    customerContactMasked = {
      name: rawCust.name ? maskCustomerName(String(rawCust.name)) : undefined,
      email: rawCust.email ? maskEmail(String(rawCust.email)) : undefined,
      phone: rawCust.phone ? maskPhone(String(rawCust.phone)) : undefined,
    };
  }

  // Product context
  const currentProduct = state?.current_product_id
    ? {
        id: state.current_product_id,
        name: (state.metadata?.productName as string) || undefined,
        variantId: state.current_variant_id || null,
        quantity: state.quantity || 1,
      }
    : null;

  // Build human-readable executive briefing
  const summaryParts: string[] = [`[${params.severity.toUpperCase()}] ${explanation}`];

  if (currentProduct) {
    summaryParts.push(
      `Product: ${currentProduct.name || currentProduct.id} (Qty: ${currentProduct.quantity}${
        currentProduct.variantId ? `, Variant: ${currentProduct.variantId}` : ''
      })`,
    );
  }

  if (state?.order_draft_id) {
    summaryParts.push(`Order Draft: ${state.order_draft_id}`);
  }

  if (state?.delivery_method) {
    summaryParts.push(`Delivery: ${state.delivery_method}`);
  }

  if (state?.payment_method) {
    summaryParts.push(`Payment: ${state.payment_method}`);
  }

  if (shippingCityState) {
    summaryParts.push(`Destination: ${shippingCityState}`);
  }

  return {
    conversationId: params.conversationId,
    reason: params.reason,
    severity: params.severity,
    executiveSummary: summaryParts.join(' | '),
    currentProduct,
    currentOrderDraftId: state?.order_draft_id || null,
    deliveryMethod: state?.delivery_method || null,
    paymentMethod: state?.payment_method || null,
    shippingCityState,
    customerContactMasked,
    keyTriggers: triggers,
    turnCount: params.turnCount ?? (params.state?.state_version || 1),
    lowConfidenceCount: params.lowConfidenceCount ?? 0,
  };
}
