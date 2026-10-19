/**
 * Google AI Customer Care - Server Configuration & Telemetry Logger
 *
 * Enforces server-only execution boundaries, handles environment resolution,
 * enforces fail-closed semantics when API key is missing in real mode,
 * provides sensible model defaults, and provides safe, PII-sanitized telemetry logging.
 */

import type {
  GoogleAiLogger,
  GoogleAiProviderConfig,
  GoogleAiProviderMode,
  GoogleAiResponseMetadata,
  ResolvedGoogleAiConfig,
} from './google-provider-types.js';
import { GoogleAiConfigError } from './google-provider-errors.js';

export const DEFAULT_GOOGLE_AI_MODEL = 'gemini-2.5-flash';
export const DEFAULT_GOOGLE_AI_TIMEOUT_MS = 20_000; // 20 seconds
export const DEFAULT_GOOGLE_AI_MAX_RETRIES = 2;
export const DEFAULT_BASE_RETRY_DELAY_MS = 250;
export const DEFAULT_MAX_RETRY_DELAY_MS = 2_000;

/**
 * Asserts that the code is running strictly in a server-side environment.
 * Prevents accidental inclusion or execution in browser or Vite client bundles.
 */
export function assertServerOnly(): void {
  // Check standard browser globals
  if (typeof window !== 'undefined' || typeof document !== 'undefined') {
    throw new GoogleAiConfigError(
      'Google AI Provider adapter is server-only and cannot be imported or executed in a browser environment.',
      'CLIENT_ENVIRONMENT_VIOLATION'
    );
  }
}

/**
 * Resolves configuration from environment variables and explicit options.
 * Enforces fail-closed semantics for real provider mode if GOOGLE_AI_API_KEY is missing.
 */
export function resolveGoogleAiConfig(overrides?: Partial<GoogleAiProviderConfig>): ResolvedGoogleAiConfig {
  assertServerOnly();

  const rawMode = overrides?.mode || process.env.GOOGLE_AI_PROVIDER_MODE;
  let mode: GoogleAiProviderMode;

  if (rawMode === 'real' || rawMode === 'mock') {
    mode = rawMode;
  } else if (process.env.NODE_ENV === 'test') {
    mode = 'mock';
  } else {
    mode = 'real';
  }

  const apiKey = String(overrides?.apiKey ?? process.env.GOOGLE_AI_API_KEY ?? '').trim();
  const rawModel = overrides?.model ?? process.env.GOOGLE_AI_MODEL;
  const model = (rawModel && String(rawModel).trim()) ? String(rawModel).trim() : DEFAULT_GOOGLE_AI_MODEL;

  const rawTimeout = overrides?.timeoutMs ?? (process.env.GOOGLE_AI_TIMEOUT_MS ? parseInt(process.env.GOOGLE_AI_TIMEOUT_MS, 10) : undefined);
  const timeoutMs = (rawTimeout !== undefined && !Number.isNaN(rawTimeout)) ? Math.max(1000, rawTimeout) : DEFAULT_GOOGLE_AI_TIMEOUT_MS;

  const rawRetries = overrides?.maxRetries ?? (process.env.GOOGLE_AI_MAX_RETRIES ? parseInt(process.env.GOOGLE_AI_MAX_RETRIES, 10) : undefined);
  const maxRetries = (rawRetries !== undefined && !Number.isNaN(rawRetries)) ? Math.min(5, Math.max(0, rawRetries)) : DEFAULT_GOOGLE_AI_MAX_RETRIES;

  const baseRetryDelayMs = overrides?.baseRetryDelayMs ?? DEFAULT_BASE_RETRY_DELAY_MS;
  const maxRetryDelayMs = overrides?.maxRetryDelayMs ?? DEFAULT_MAX_RETRY_DELAY_MS;

  if (mode === 'real') {
    if (!apiKey) {
      throw new GoogleAiConfigError(
        'GOOGLE_AI_API_KEY is missing or empty. Real Google AI provider mode requires a valid API key (fail-closed).',
        'MISSING_API_KEY'
      );
    }
  }

  return {
    apiKey,
    model,
    mode,
    timeoutMs,
    maxRetries,
    baseRetryDelayMs,
    maxRetryDelayMs,
  };
}

/**
 * PII-Safe Telemetry Logger
 *
 * Ensures logs contain operational metrics (latency, token usage, finish reason,
 * model identifier, attempt counts, error codes) without leaking prompt strings,
 * customer identifiers, or sensitive payload texts.
 */
export class SafeGoogleAiTelemetryLogger implements GoogleAiLogger {
  private baseLogger?: any;

  constructor(baseLogger?: any) {
    this.baseLogger = baseLogger;
  }

  debug(data: Record<string, unknown>, message?: string): void {
    if (this.baseLogger?.debug) {
      this.baseLogger.debug(this.sanitize(data), message);
    }
  }

  info(data: Record<string, unknown>, message?: string): void {
    if (this.baseLogger?.info) {
      this.baseLogger.info(this.sanitize(data), message);
    }
  }

  warn(data: Record<string, unknown>, message?: string): void {
    if (this.baseLogger?.warn) {
      this.baseLogger.warn(this.sanitize(data), message);
    }
  }

  error(data: Record<string, unknown>, message?: string): void {
    if (this.baseLogger?.error) {
      this.baseLogger.error(this.sanitize(data), message);
    }
  }

  logSuccess(metadata: GoogleAiResponseMetadata, additional?: Record<string, unknown>): void {
    const payload = {
      model: metadata.model,
      latencyMs: metadata.latencyMs,
      promptTokens: metadata.promptTokens,
      completionTokens: metadata.completionTokens,
      totalTokens: metadata.totalTokens,
      finishReason: metadata.finishReason,
      attempts: metadata.attempts,
      requestId: metadata.requestId,
      providerMode: metadata.providerMode,
      ...this.sanitize(additional),
    };
    this.info(payload, '[GoogleAI] Request completed');
  }

  logFailure(errorData: {
    code: string;
    status?: number;
    latencyMs?: number;
    attempts: number;
    retryable: boolean;
    requestId?: string;
  }): void {
    this.error(errorData, '[GoogleAI] Request failed');
  }

  private sanitize(data?: Record<string, unknown>): Record<string, unknown> {
    if (!data) return {};
    const safe: Record<string, unknown> = {};
    const disallowedKeys = new Set([
      'prompt', 'contents', 'message', 'messages', 'text',
      'userinput', 'body', 'payload', 'args', 'response',
      'apikey', 'api_key', 'token', 'authorization', 'secret',
      'customer', 'email', 'customeremail', 'phone', 'address'
    ]);

    for (const [key, val] of Object.entries(data)) {
      if (disallowedKeys.has(key.toLowerCase())) {
        continue; // Exclude completely from telemetry
      }
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        safe[key] = this.sanitize(val as Record<string, unknown>);
      } else {
        safe[key] = val;
      }
    }
    return safe;
  }
}
