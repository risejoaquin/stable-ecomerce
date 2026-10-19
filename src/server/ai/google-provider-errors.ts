/**
 * Google AI Customer Care - Structured Provider Errors
 *
 * Provides a structured error hierarchy for the Google Gemini adapter.
 * Encapsulates error codes, HTTP status, retryability flags, latency,
 * attempt tracking, and safe JSON serialization without leaking secrets
 * or customer conversation payloads.
 */

export type GoogleAiErrorCode =
  | 'MISSING_API_KEY'
  | 'CLIENT_ENVIRONMENT_VIOLATION'
  | 'PROVIDER_TIMEOUT'
  | 'RATE_LIMITED'
  | 'TRANSIENT_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'PERMISSION_DENIED'
  | 'INVALID_ARGUMENT'
  | 'SAFETY_BLOCKED'
  | 'SERVER_ERROR'
  | 'PROVIDER_ABORTED'
  | 'UNKNOWN_PROVIDER_ERROR';

export interface GoogleAiErrorOptions {
  code: GoogleAiErrorCode;
  status?: number;
  retryable?: boolean;
  latencyMs?: number;
  attempts?: number;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class GoogleAiProviderError extends Error {
  readonly code: GoogleAiErrorCode;
  readonly status?: number;
  readonly retryable: boolean;
  readonly latencyMs?: number;
  readonly attempts: number;
  readonly details?: Record<string, unknown>;

  constructor(message: string, options: GoogleAiErrorOptions) {
    super(sanitizeErrorMessage(message));
    this.name = 'GoogleAiProviderError';
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.latencyMs = options.latencyMs;
    this.attempts = options.attempts ?? 1;
    this.details = sanitizeDetails(options.details);
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      retryable: this.retryable,
      latencyMs: this.latencyMs,
      attempts: this.attempts,
      details: this.details,
    };
  }
}

export class GoogleAiConfigError extends GoogleAiProviderError {
  constructor(message: string, code: 'MISSING_API_KEY' | 'CLIENT_ENVIRONMENT_VIOLATION' = 'MISSING_API_KEY') {
    super(message, {
      code,
      retryable: false,
    });
    this.name = 'GoogleAiConfigError';
  }
}

export class GoogleAiTimeoutError extends GoogleAiProviderError {
  constructor(message = 'Google AI request timed out', options?: Partial<GoogleAiErrorOptions>) {
    super(message, {
      code: 'PROVIDER_TIMEOUT',
      status: options?.status ?? 504,
      retryable: options?.retryable ?? false,
      latencyMs: options?.latencyMs,
      attempts: options?.attempts ?? 1,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'GoogleAiTimeoutError';
  }
}

export class GoogleAiRateLimitError extends GoogleAiProviderError {
  constructor(message = 'Google AI rate limit exceeded', options?: Partial<GoogleAiErrorOptions>) {
    super(message, {
      code: 'RATE_LIMITED',
      status: options?.status ?? 429,
      retryable: true,
      latencyMs: options?.latencyMs,
      attempts: options?.attempts ?? 1,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'GoogleAiRateLimitError';
  }
}

export class GoogleAiTransientError extends GoogleAiProviderError {
  constructor(message = 'Google AI service temporarily unavailable', options?: Partial<GoogleAiErrorOptions>) {
    super(message, {
      code: 'TRANSIENT_ERROR',
      status: options?.status ?? 503,
      retryable: true,
      latencyMs: options?.latencyMs,
      attempts: options?.attempts ?? 1,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'GoogleAiTransientError';
  }
}

export class GoogleAiAuthError extends GoogleAiProviderError {
  constructor(message = 'Google AI authentication failed', options?: Partial<GoogleAiErrorOptions>) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      status: options?.status ?? 401,
      retryable: false,
      latencyMs: options?.latencyMs,
      attempts: options?.attempts ?? 1,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'GoogleAiAuthError';
  }
}

export class GoogleAiSafetyBlockedError extends GoogleAiProviderError {
  constructor(message = 'Google AI generation blocked by safety filters', options?: Partial<GoogleAiErrorOptions>) {
    super(message, {
      code: 'SAFETY_BLOCKED',
      retryable: false,
      latencyMs: options?.latencyMs,
      attempts: options?.attempts ?? 1,
      details: options?.details,
      cause: options?.cause,
    });
    this.name = 'GoogleAiSafetyBlockedError';
  }
}

/**
 * Detects whether an error is transient and can be retried.
 * Only rate limits (429), server unavailability (502, 503, 504),
 * and transient network errors are considered retryable.
 * Client errors (400, 401, 403, 404, safety blocks) are strictly non-retryable.
 */
export function isTransientError(error: unknown): boolean {
  if (!error) return false;

  if (error instanceof GoogleAiProviderError) {
    return error.retryable;
  }

  const err = error as Record<string, unknown>;

  // Check HTTP status code
  const status = typeof err.status === 'number'
    ? err.status
    : (typeof err.statusCode === 'number' ? err.statusCode : undefined);

  if (status !== undefined) {
    if (status === 429) return true;
    if (status === 502 || status === 503 || status === 504) return true;
    // 400, 401, 403, 404, 500 without explicit transient indicator are not retryable
    return false;
  }

  // Check error name or code for network-level drops
  const code = typeof err.code === 'string' ? err.code : '';
  const transientNetworkCodes = new Set([
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'EAI_AGAIN',
    'UND_ERR_CONNECT_TIMEOUT',
    'UND_ERR_SOCKET',
  ]);
  if (transientNetworkCodes.has(code)) {
    return true;
  }

  const name = typeof err.name === 'string' ? err.name : '';
  const message = typeof err.message === 'string' ? err.message.toLowerCase() : '';

  if (name === 'AbortError' || message.includes('abort')) {
    return false;
  }

  if (
    message.includes('resource_exhausted') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('temporarily unavailable') ||
    message.includes('service unavailable') ||
    message.includes('socket hang up') ||
    message.includes('econnreset')
  ) {
    return true;
  }

  return false;
}

/**
 * Maps arbitrary vendor/SDK errors to structured GoogleAiProviderError instances.
 */
export function mapToProviderError(
  error: unknown,
  context: { attempts: number; latencyMs?: number; isTimeout?: boolean }
): GoogleAiProviderError {
  if (error instanceof GoogleAiProviderError) {
    return error;
  }

  const err = error as Record<string, unknown>;
  const rawMessage = typeof err?.message === 'string' ? err.message : String(error || 'Unknown error');
  const status = typeof err?.status === 'number'
    ? err.status
    : (typeof err?.statusCode === 'number' ? err.statusCode : undefined);

  if (context.isTimeout || err?.name === 'AbortError' || rawMessage.toLowerCase().includes('timed out')) {
    return new GoogleAiTimeoutError('Google AI provider request timed out', {
      latencyMs: context.latencyMs,
      attempts: context.attempts,
      cause: error,
    });
  }

  if (status === 429 || rawMessage.includes('RESOURCE_EXHAUSTED')) {
    return new GoogleAiRateLimitError('Google AI rate limit or quota exceeded', {
      status: 429,
      latencyMs: context.latencyMs,
      attempts: context.attempts,
      cause: error,
    });
  }

  if (status === 401 || status === 403 || rawMessage.includes('API_KEY_INVALID') || rawMessage.includes('PERMISSION_DENIED')) {
    return new GoogleAiAuthError('Google AI authentication failed or permission denied', {
      status,
      latencyMs: context.latencyMs,
      attempts: context.attempts,
      cause: error,
    });
  }

  if (status === 400 || rawMessage.includes('INVALID_ARGUMENT')) {
    return new GoogleAiProviderError('Invalid arguments supplied to Google AI provider', {
      code: 'INVALID_ARGUMENT',
      status: 400,
      retryable: false,
      latencyMs: context.latencyMs,
      attempts: context.attempts,
      cause: error,
    });
  }

  if (status === 502 || status === 503 || status === 504 || isTransientError(error)) {
    return new GoogleAiTransientError('Google AI service transient failure', {
      status: status ?? 503,
      latencyMs: context.latencyMs,
      attempts: context.attempts,
      cause: error,
    });
  }

  return new GoogleAiProviderError('Google AI provider error occurred', {
    code: 'UNKNOWN_PROVIDER_ERROR',
    status,
    retryable: false,
    latencyMs: context.latencyMs,
    attempts: context.attempts,
    cause: error,
  });
}

function sanitizeErrorMessage(msg: string): string {
  if (!msg) return '';
  // Redact any patterns resembling API keys or tokens
  return msg
    .replace(/(?:AIza[0-9A-Za-z-_]{35})/g, '[REDACTED_API_KEY]')
    .replace(/(?:key=)[^& \s]+/gi, 'key=[REDACTED]');
}

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;
  const safe: Record<string, unknown> = {};
  const forbidden = new Set([
    'apikey', 'api_key', 'authorization', 'token', 'secret',
    'password', 'prompt', 'contents', 'message', 'text', 'userinput',
    'email', 'phone', 'customer', 'customeremail'
  ]);

  for (const [key, value] of Object.entries(details)) {
    if (forbidden.has(key.toLowerCase())) {
      safe[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      safe[key] = sanitizeDetails(value as Record<string, unknown>);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}
