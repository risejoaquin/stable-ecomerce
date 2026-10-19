/**
 * Google AI Customer Care - Tool Execution Audit & PII Minimization
 *
 * Implements strict telemetry sanitization and PII redaction for all tool executions.
 * Never stores or logs raw passwords, full payment data, full street addresses,
 * unmasked customer emails, or sensitive tokens.
 */

import crypto from 'crypto';
import type { AiToolAuditMetadata, AllowedToolName } from './tool-types.js';

/**
 * Mask an email address to preserve domain context while minimizing PII:
 * e.g. "alexander.hamilton@example.com" -> "a***n@example.com"
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '[REDACTED_EMAIL]';
  const parts = email.split('@');
  if (parts.length !== 2) return '[REDACTED_EMAIL]';
  const [local, domain] = parts;
  if (local.length <= 2) {
    return `${local[0] || '*'}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

/**
 * Mask an idempotency key to a short deterministic fingerprint:
 * e.g. "order-draft-session-12345-abcde" -> "idem_a1b2c3d4"
 */
export function maskIdempotencyKey(key?: string): string | undefined {
  if (!key) return undefined;
  const hash = crypto.createHash('sha256').update(key).digest('hex').substring(0, 8);
  return `idem_${hash}`;
}

/**
 * Recursively redacts PII from arguments and payloads.
 */
export function redactPii(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Check for email
    if (value.includes('@') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      return maskEmail(value.trim());
    }
    // Check for PAN / credit card patterns
    if (/\b(?:\d[ -]?){13,19}\b/.test(value)) {
      return '[REDACTED_CARD]';
    }
    // Check for phone patterns
    if (/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/.test(value) && value.length >= 10) {
      return '[REDACTED_PHONE]';
    }
    // Check for bearer tokens or secrets
    if (/bearer\s+[a-z0-9._-]+/i.test(value) || /^(?:sk|rk)_(?:live|test)_[a-z0-9]+/i.test(value)) {
      return '[REDACTED_SECRET]';
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactPii(item));
  }

  if (typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lowerKey = k.toLowerCase();
      // Explicit sensitive keys
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('cookie') ||
        lowerKey.includes('cvv') ||
        lowerKey.includes('cardnumber') ||
        lowerKey.includes('pan')
      ) {
        sanitized[k] = '[REDACTED_SECRET]';
      } else if (lowerKey.includes('email')) {
        sanitized[k] = typeof v === 'string' ? maskEmail(v) : '[REDACTED_EMAIL]';
      } else if (
        lowerKey.includes('street') ||
        lowerKey.includes('shippingaddress') ||
        lowerKey.includes('billingaddress')
      ) {
        sanitized[k] = '[REDACTED_ADDRESS]';
      } else if (lowerKey.includes('phone')) {
        sanitized[k] = '[REDACTED_PHONE]';
      } else if (lowerKey === 'idempotencykey') {
        sanitized[k] = typeof v === 'string' ? maskIdempotencyKey(v) : '[REDACTED_IDEMPOTENCY]';
      } else {
        sanitized[k] = redactPii(v);
      }
    }
    return sanitized;
  }

  return value;
}

/**
 * Builds structured audit metadata for tool execution.
 */
export function buildAuditMetadata(params: {
  toolName: AllowedToolName | string;
  executionId: string;
  startTime: number;
  success: boolean;
  errorCode?: string;
  idempotencyKey?: string;
  rawArgs: unknown;
}): AiToolAuditMetadata {
  const durationMs = Math.max(0, Date.now() - params.startTime);
  // Do not retain user-controlled text, identifiers, addresses, or validation payloads.
  const sanitizedArgs: Record<string, unknown> = {};

  return {
    toolName: params.toolName,
    executionId: params.executionId,
    timestamp: new Date().toISOString(),
    durationMs,
    success: params.success,
    errorCode: params.errorCode,
    idempotencyKey: maskIdempotencyKey(params.idempotencyKey),
    sanitizedArgs,
    piiMinified: true,
  };
}
