import type { ConversationShippingLocation, CustomerInfo } from './order-types';
import type { FulfillmentAuditLog } from './fulfillment-types';

/**
 * Validates a credit card number candidate using the Luhn checksum algorithm.
 */
export function isValidLuhn(digits: string): boolean {
  const cleanDigits = digits.replace(/\D/g, '');
  if (cleanDigits.length < 2 || cleanDigits.length > 19) {
    return false;
  }

  let sum = 0;
  let shouldDouble = false;

  for (let i = cleanDigits.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanDigits.charAt(i), 10);

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
}

/**
 * Regular expressions for detecting credit card PANs, CVVs, and expiration dates.
 */
const CARD_PAN_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
const CVV_CONTEXT_REGEX = /(?:\b(?:cvv|cvc|seguridad|codigo|código)\b\D{0,4})(\d{3,4})\b/gi;
const STANDALONE_CVV_REGEX = /\b\d{3,4}\b/;
const CARD_EXP_REGEX = /\b(?:0[1-9]|1[0-2])[\/\-](?:20)?(?:2[4-9]|[3-9]\d)\b/g;

/**
 * Detects and redacts card PANs, CVVs, and expiration dates from text.
 * Never stores or logs raw card data.
 */
export function detectAndRedactCardData(text: string): {
  containsCardData: boolean;
  redactedText: string;
  detectedCardCount: number;
  detectedCvvCount: number;
} {
  if (!text || typeof text !== 'string') {
    return {
      containsCardData: false,
      redactedText: text || '',
      detectedCardCount: 0,
      detectedCvvCount: 0,
    };
  }

  let containsCardData = false;
  let detectedCardCount = 0;
  let detectedCvvCount = 0;

  // 1. Redact CVV with contextual prefix first
  let redacted = text.replace(CVV_CONTEXT_REGEX, (match, cvvDigits) => {
    containsCardData = true;
    detectedCvvCount++;
    return match.replace(cvvDigits, '[CVV_REDACTED]');
  });

  // 2. Scan and redact card PAN candidates (13-19 digits matching Luhn or typical formatting)
  redacted = redacted.replace(CARD_PAN_REGEX, (match) => {
    const clean = match.replace(/[\s-]/g, '');
    if (clean.length >= 13 && clean.length <= 19) {
      if (isValidLuhn(clean) || (clean.length === 16 && /^[3-6]/.test(clean))) {
        containsCardData = true;
        detectedCardCount++;
        return '[PAN_REDACTED]';
      }
    }
    return match;
  });

  // 3. Redact expiration dates if card context is detected
  if (containsCardData) {
    redacted = redacted.replace(CARD_EXP_REGEX, '[EXP_REDACTED]');
  }

  return {
    containsCardData,
    redactedText: redacted,
    detectedCardCount,
    detectedCvvCount,
  };
}

/**
 * Masks an email address for safe PII logging:
 * e.g., "alexandra.smith@example.com" -> "a***h@example.com"
 * e.g., "me@domain.com" -> "m***e@domain.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email || typeof email !== 'string') return '[NO_EMAIL]';
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf('@');
  if (atIndex <= 0) return '[REDACTED_EMAIL]';

  const localPart = trimmed.slice(0, atIndex);
  const domainPart = trimmed.slice(atIndex + 1);

  if (localPart.length <= 2) {
    return `${localPart.charAt(0)}***@${domainPart}`;
  }

  const maskedLocal = `${localPart.charAt(0)}***${localPart.charAt(localPart.length - 1)}`;
  return `${maskedLocal}@${domainPart}`;
}

/**
 * Masks a phone number for safe PII logging:
 * e.g., "+52 55 1234 5678" -> "+52 55 **** 5678"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone || typeof phone !== 'string') return '[NO_PHONE]';
  const clean = phone.trim();
  if (clean.length <= 4) return '****';

  const prefixLen = clean.startsWith('+') ? 6 : 4;
  const prefix = clean.slice(0, prefixLen);
  const suffix = clean.slice(-4);
  return `${prefix} **** ${suffix}`;
}

/**
 * Masks customer name for safe PII logging:
 * e.g., "Carlos Mendoza" -> "C***s M***a"
 */
export function maskCustomerName(name: string | null | undefined): string {
  if (!name || typeof name !== 'string') return '[NO_NAME]';
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => {
      if (p.length <= 2) return `${p.charAt(0)}*`;
      return `${p.charAt(0)}***${p.charAt(p.length - 1)}`;
    })
    .join(' ');
}

/**
 * Masks a shipping address for safe logging, preserving city/state/postal code prefix for operational verification:
 * e.g., "Calle Colima 123, Int 4, Roma Norte, Cuauhtémoc, CDMX, 06700"
 * -> "[Calle C*** #***, Col. R***, Cuauhtémoc, CDMX, CP 06***]"
 */
export function maskAddress(
  address: ConversationShippingLocation | string | null | undefined,
): string {
  if (!address) return '[NO_ADDRESS]';

  if (typeof address === 'string') {
    const raw = address.trim();
    if (raw.length <= 10) return '[REDACTED_ADDRESS]';
    return `${raw.slice(0, 5)}...[REDACTED_ADDRESS]...${raw.slice(-6)}`;
  }

  const line1 = address.addressLine1
    ? `${address.addressLine1.charAt(0)}***`
    : '[LINE1_REDACTED]';
  const city = address.city || '[CITY]';
  const state = address.state || '[STATE]';
  const postalCode = address.postalCode
    ? `${address.postalCode.slice(0, 2)}***`
    : '[CP]';

  return `[Calle ${line1}, ${city}, ${state}, CP ${postalCode}]`;
}

/**
 * Sanitizes customer info into a masked, audit-ready representation.
 */
export function sanitizeCustomerData(
  customer: Partial<CustomerInfo> | null | undefined,
): Record<string, unknown> {
  if (!customer) return {};

  return {
    name: maskCustomerName(customer.name),
    email: maskEmail(customer.email),
    phone: customer.phone ? maskPhone(customer.phone) : undefined,
    shippingAddress: customer.shippingAddress
      ? maskAddress(customer.shippingAddress)
      : undefined,
  };
}

const PII_KEYS = new Set([
  'name',
  'fullname',
  'full_name',
  'customer_name',
  'recipientname',
  'recipient_name',
  'email',
  'customer_email',
  'customeremail',
  'phone',
  'telephone',
  'recipientphone',
  'recipient_phone',
  'mobile',
  'address',
  'shipping_address',
  'shippingaddress',
  'addressline1',
  'addressline2',
  'rawtext',
  'password',
  'secret',
  'pan',
  'card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
]);

/**
 * Recursively sanitizes any arbitrary object or array before writing to logs.
 */
export function sanitizeFulfillmentLog<T>(input: T, depth: number = 0): T {
  if (depth > 6) return '[MAX_DEPTH]' as unknown as T;
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    const cardCheck = detectAndRedactCardData(input);
    return cardCheck.redactedText as unknown as T;
  }

  if (typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeFulfillmentLog(item, depth + 1)) as unknown as T;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase().replace(/[-_]/g, '');

    if (lowerKey === 'email' || lowerKey.endsWith('email')) {
      sanitized[key] = typeof value === 'string' ? maskEmail(value) : maskEmail(String(value));
    } else if (lowerKey === 'phone' || lowerKey.endsWith('phone')) {
      sanitized[key] = typeof value === 'string' ? maskPhone(value) : maskPhone(String(value));
    } else if (lowerKey === 'name' || lowerKey === 'fullname' || lowerKey.endsWith('name')) {
      sanitized[key] = typeof value === 'string' ? maskCustomerName(value) : maskCustomerName(String(value));
    } else if (
      lowerKey === 'address' ||
      lowerKey === 'shippingaddress' ||
      lowerKey.includes('address')
    ) {
      sanitized[key] = maskAddress(value as any);
    } else if (
      lowerKey.includes('card') ||
      lowerKey.includes('pan') ||
      lowerKey === 'cvv' ||
      lowerKey === 'cvc' ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token')
    ) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeFulfillmentLog(value, depth + 1);
      } else {
        sanitized[key] = '[REDACTED]';
      }
    } else {
      sanitized[key] = sanitizeFulfillmentLog(value, depth + 1);
    }
  }

  return sanitized as T;
}

/**
 * Creates an audit log entry with guaranteed PII sanitization.
 */
export function createFulfillmentLogEntry(
  action: string,
  conversationId: string,
  data: Record<string, unknown>,
  channel: string = 'instagram',
): FulfillmentAuditLog {
  return {
    timestamp: new Date().toISOString(),
    action,
    conversationId,
    channel,
    data: sanitizeFulfillmentLog(data),
  };
}
