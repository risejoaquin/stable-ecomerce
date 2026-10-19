import crypto from 'node:crypto';
import type {
  MetaSignatureVerificationResult,
  MetaVerificationHandshakeResult,
} from './webhook-types';

/**
 * Constant-time string equality check to mitigate timing attacks.
 */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verifies HMAC-SHA256 signature from Meta webhook headers (`x-hub-signature-256`).
 *
 * Requirements:
 * - Constant-time comparison using `crypto.timingSafeEqual`
 * - Must reject missing, empty, or malformed signature headers
 * - Must reject unconfigured secrets (fails closed)
 */
export function verifyMetaSignature(
  rawPayload: Buffer | string,
  signatureHeader: string | undefined | null,
  appSecret: string | undefined | null,
): MetaSignatureVerificationResult {
  if (!appSecret || typeof appSecret !== 'string' || !appSecret.trim()) {
    return {
      valid: false,
      reason: 'app_secret_missing',
    };
  }

  if (!signatureHeader || typeof signatureHeader !== 'string' || !signatureHeader.trim()) {
    return {
      valid: false,
      reason: 'missing_signature_header',
    };
  }

  const trimmed = signatureHeader.trim();
  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) {
    return {
      valid: false,
      reason: 'malformed_signature_header',
    };
  }

  const algorithm = trimmed.slice(0, equalsIndex).toLowerCase();
  const providedHash = trimmed.slice(equalsIndex + 1).toLowerCase();

  if (algorithm !== 'sha256') {
    return {
      valid: false,
      reason: `unsupported_algorithm_${algorithm}`,
    };
  }

  // A valid sha256 hex string is exactly 64 hex characters (32 bytes)
  if (!/^[0-9a-f]{64}$/.test(providedHash)) {
    return {
      valid: false,
      reason: 'malformed_signature_hash',
    };
  }

  try {
    const payloadBuffer = Buffer.isBuffer(rawPayload)
      ? rawPayload
      : Buffer.from(rawPayload, 'utf8');

    const expectedHash = crypto
      .createHmac('sha256', appSecret)
      .update(payloadBuffer)
      .digest('hex');

    const providedBuf = Buffer.from(providedHash, 'hex');
    const expectedBuf = Buffer.from(expectedHash, 'hex');

    if (providedBuf.length !== expectedBuf.length) {
      return {
        valid: false,
        reason: 'signature_mismatch',
      };
    }

    const matches = crypto.timingSafeEqual(providedBuf, expectedBuf);
    if (!matches) {
      return {
        valid: false,
        reason: 'signature_mismatch',
      };
    }

    return { valid: true };
  } catch (err: any) {
    return {
      valid: false,
      reason: `verification_error_${err?.message || 'unknown'}`,
    };
  }
}

/**
 * Verifies GET webhook challenge handshake from Meta Graph API.
 *
 * Query parameters:
 * - `hub.mode` (must be 'subscribe')
 * - `hub.verify_token` (must match expected token)
 * - `hub.challenge` (token echoed back on success)
 */
export function verifyMetaWebhookChallenge(
  query: Record<string, unknown>,
  expectedVerifyToken: string | undefined | null,
): MetaVerificationHandshakeResult {
  if (!expectedVerifyToken || !expectedVerifyToken.trim()) {
    return {
      valid: false,
      reason: 'verify_token_not_configured',
    };
  }

  const mode = query['hub.mode'];
  const verifyToken = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode !== 'subscribe') {
    return {
      valid: false,
      reason: 'invalid_hub_mode',
    };
  }

  if (typeof verifyToken !== 'string' || !timingSafeStringEqual(verifyToken, expectedVerifyToken)) {
    return {
      valid: false,
      reason: 'verify_token_mismatch',
    };
  }

  if (challenge === undefined || challenge === null || String(challenge).trim() === '') {
    return {
      valid: false,
      reason: 'missing_hub_challenge',
    };
  }

  return {
    valid: true,
    challenge: String(challenge),
  };
}
