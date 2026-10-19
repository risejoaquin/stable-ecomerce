/**
 * Sensitive keys that must NEVER appear in plain text in logs or telemetry.
 */
export const SENSITIVE_WEBHOOK_KEYS = new Set([
  'meta_app_secret',
  'meta_webhook_secret',
  'meta_verify_token',
  'meta_webhook_verify_token',
  'x-hub-signature-256',
  'x-hub-signature',
  'authorization',
  'cookie',
  'secret',
  'appsecret',
  'verifytoken',
  'token',
]);

/**
 * Masks a sensitive string value, preserving leading/trailing chars for debugging if sufficiently long.
 */
export function maskSensitiveValue(val: string): string {
  if (!val || typeof val !== 'string') return '[REDACTED]';
  if (val.length <= 8) return '[REDACTED]';
  return `${val.slice(0, 3)}...${val.slice(-3)}[REDACTED]`;
}

/**
 * Masks an external user ID or phone/email for PII protection in operational logs.
 */
export function maskExternalUserId(id: string): string {
  if (!id || typeof id !== 'string') return '[REDACTED]';
  if (id.length <= 4) return '***';
  return `${id.slice(0, 2)}****${id.slice(-2)}`;
}

/**
 * Deep-sanitizes any data structure before logging.
 */
export function sanitizeLogData(input: unknown, depth: number = 0): unknown {
  if (depth > 6) return '[MAX_DEPTH]';
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    let result = input;
    // Redact Bearer tokens if found
    if (/bearer\s+[a-zA-Z0-9._-]+/i.test(result)) {
      result = result.replace(/bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED]');
    }
    // Redact sha256 signatures if embedded
    if (/sha256=[a-f0-9]{64}/i.test(result)) {
      result = result.replace(/sha256=[a-f0-9]{64}/gi, 'sha256=[REDACTED]');
    }
    return result;
  }

  if (typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => sanitizeLogData(item, depth + 1));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_WEBHOOK_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('signature')) {
      sanitized[key] = '[REDACTED]';
    } else if (lowerKey === 'externaluserid' || lowerKey === 'sender' || lowerKey === 'recipient') {
      if (typeof value === 'string') {
        sanitized[key] = maskExternalUserId(value);
      } else if (typeof value === 'object' && value !== null && 'id' in (value as any)) {
        sanitized[key] = {
          ...(value as any),
          id: maskExternalUserId(String((value as any).id)),
        };
      } else {
        sanitized[key] = sanitizeLogData(value, depth + 1);
      }
    } else {
      sanitized[key] = sanitizeLogData(value, depth + 1);
    }
  }

  return sanitized;
}
