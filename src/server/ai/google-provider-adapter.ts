/**
 * Google AI Customer Care - Server-Only Google Gemini Provider Adapter
 *
 * Implements the GoogleAiProvider interface using the official @google/genai SDK.
 * Features:
 * - Server-only execution boundary
 * - Configurable model via GOOGLE_AI_MODEL (sensible server-side default)
 * - Strict timeout enforcement with request abortion
 * - Bounded exponential-backoff retries for transient provider errors ONLY
 * - Structured error mapping and classification
 * - PII-minimized telemetry without storing raw sensitive conversation text
 * - Dependency injection of client, logger, and sleep for full test isolation
 */

import { GoogleGenAI } from '@google/genai';
import type {
  GoogleAiContent,
  GoogleAiDependencies,
  GoogleAiFunctionCall,
  GoogleAiGenerateRequest,
  GoogleAiGenerateResponse,
  GoogleAiHealthResult,
  GoogleAiProvider,
  GoogleAiProviderConfig,
  GoogleAiProviderMode,
  GoogleAiRequestOptions,
  GoogleAiResponseMetadata,
  ResolvedGoogleAiConfig,
} from './google-provider-types.js';
import {
  isTransientError,
  mapToProviderError,
  GoogleAiProviderError,
  GoogleAiTimeoutError,
} from './google-provider-errors.js';
import {
  assertServerOnly,
  resolveGoogleAiConfig,
  SafeGoogleAiTelemetryLogger,
} from './google-provider-config.js';

export class GoogleAiSdkAdapter implements GoogleAiProvider {
  readonly mode: GoogleAiProviderMode = 'real';
  private readonly config: ResolvedGoogleAiConfig;
  private readonly client: any;
  private readonly telemetryLogger: SafeGoogleAiTelemetryLogger;
  private readonly sleepFn: (ms: number) => Promise<void>;

  constructor(
    configOverrides?: Partial<GoogleAiProviderConfig>,
    dependencies?: GoogleAiDependencies
  ) {
    assertServerOnly();
    this.config = resolveGoogleAiConfig({ ...configOverrides, mode: 'real' });
    this.telemetryLogger = new SafeGoogleAiTelemetryLogger(dependencies?.logger);
    this.sleepFn = dependencies?.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));

    if (dependencies?.client) {
      this.client = dependencies.client;
    } else {
      this.client = new GoogleGenAI({
        apiKey: this.config.apiKey,
      });
    }
  }

  getModel(): string {
    return this.config.model;
  }

  async generate(
    request: GoogleAiGenerateRequest,
    options?: GoogleAiRequestOptions
  ): Promise<GoogleAiGenerateResponse> {
    assertServerOnly();

    const modelName = options?.model || request.model || this.config.model;
    const timeoutMs = options?.timeoutMs ?? this.config.timeoutMs;
    const maxRetries = options?.maxRetries ?? this.config.maxRetries;
    const requestId = options?.requestId;

    let attempt = 0;
    const maxAttempts = maxRetries + 1;
    const startTime = Date.now();

    while (attempt < maxAttempts) {
      attempt++;
      const attemptStartTime = Date.now();

      // Check external cancellation before attempting
      if (options?.signal?.aborted) {
        const error = new GoogleAiProviderError('Google AI request aborted by caller', {
          code: 'PROVIDER_ABORTED',
          retryable: false,
          attempts: attempt,
          latencyMs: Date.now() - startTime,
        });
        this.telemetryLogger.logFailure({
          code: error.code,
          status: error.status,
          latencyMs: error.latencyMs,
          attempts: attempt,
          retryable: false,
          requestId,
        });
        throw error;
      }

      // Setup per-attempt timeout
      const abortController = new AbortController();
      let timer: any = null;

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          abortController.abort();
          reject(new GoogleAiTimeoutError(`Google AI request timed out after ${timeoutMs}ms`, {
            latencyMs: Date.now() - attemptStartTime,
            attempts: attempt,
          }));
        }, timeoutMs);
      });

      // Forward external signal abortion
      const externalSignal = options?.signal;
      let rejectCancellation: (error: GoogleAiProviderError) => void;
      const cancellationPromise = new Promise<never>((_, reject) => {
        rejectCancellation = reject;
      });
      const externalAbortListener = () => {
        abortController.abort();
        rejectCancellation(new GoogleAiProviderError('Google AI request aborted by caller', {
          code: 'PROVIDER_ABORTED', retryable: false, attempts: attempt,
          latencyMs: Date.now() - startTime,
        }));
      };
      if (externalSignal) {
        externalSignal.addEventListener('abort', externalAbortListener, { once: true });
      }

      try {
        const params = this.buildSdkParams(modelName, request);
        (params.config as Record<string, unknown>).abortSignal = abortController.signal;
        const sdkCallPromise = this.client.models.generateContent(params);

        const sdkResponse: any = await Promise.race([sdkCallPromise, timeoutPromise, cancellationPromise]);
        clearTimeout(timer);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', externalAbortListener);
        }

        const totalLatencyMs = Date.now() - startTime;
        const metadata = this.extractMetadata(sdkResponse, modelName, totalLatencyMs, attempt, requestId);
        const functionCalls = this.extractFunctionCalls(sdkResponse);
        const text = this.extractText(sdkResponse);

        // Safe telemetry logging without prompt/content leakage
        this.telemetryLogger.logSuccess(metadata);

        return {
          text,
          functionCalls,
          metadata,
        };
      } catch (err: unknown) {
        clearTimeout(timer);
        if (externalSignal) {
          externalSignal.removeEventListener('abort', externalAbortListener);
        }

        const attemptLatencyMs = Date.now() - attemptStartTime;
        const totalLatencyMs = Date.now() - startTime;
        const isTimeout = err instanceof GoogleAiTimeoutError || (err as any)?.name === 'AbortError';
        const transient = isTransientError(err);

        // If error is transient and we have remaining attempts, retry with exponential backoff + jitter
        if (transient && attempt < maxAttempts && !options?.signal?.aborted) {
          const delay = this.calculateBackoff(attempt);
          this.telemetryLogger.warn(
            {
              attempt,
              maxAttempts,
              retryDelayMs: delay,
              model: modelName,
              requestId,
            },
            `[GoogleAI] Transient error on attempt ${attempt}/${maxAttempts}. Retrying in ${delay}ms...`
          );

          await this.sleepFn(delay);
          continue;
        }

        // Non-transient or retries exhausted: fail with structured error
        const structuredError = options?.signal?.aborted
          ? new GoogleAiProviderError('Google AI request aborted by caller', {
            code: 'PROVIDER_ABORTED', retryable: false, attempts: attempt,
            latencyMs: totalLatencyMs,
          })
          : mapToProviderError(err, {
          attempts: attempt,
          latencyMs: totalLatencyMs,
          isTimeout,
        });

        this.telemetryLogger.logFailure({
          code: structuredError.code,
          status: structuredError.status,
          latencyMs: totalLatencyMs,
          attempts: attempt,
          retryable: structuredError.retryable,
          requestId,
        });

        throw structuredError;
      }
    }

    // Fallback if loop finishes unexpectedly
    throw new GoogleAiProviderError('Exhausted all retry attempts for Google AI provider', {
      code: 'TRANSIENT_ERROR',
      retryable: false,
      attempts: attempt,
      latencyMs: Date.now() - startTime,
    });
  }

  async healthCheck(): Promise<GoogleAiHealthResult> {
    assertServerOnly();
    const startTime = Date.now();
    try {
      if (typeof this.client?.models?.countTokens === 'function') {
        await this.client.models.countTokens({
          model: this.config.model,
          contents: 'health check',
        });
      }
      return {
        status: 'healthy',
        provider: 'google-genai',
        model: this.config.model,
        mode: this.mode,
        latencyMs: Date.now() - startTime,
      };
    } catch (err: any) {
      const isConfigOrAuth = err?.status === 401 || err?.status === 403 || err?.code === 'MISSING_API_KEY';
      return {
        status: isConfigOrAuth ? 'unhealthy' : 'degraded',
        provider: 'google-genai',
        model: this.config.model,
        mode: this.mode,
        latencyMs: Date.now() - startTime,
        error: mapToProviderError(err, { attempts: 1, latencyMs: Date.now() - startTime }).message,
      };
    }
  }

  private buildSdkParams(model: string, request: GoogleAiGenerateRequest): Record<string, unknown> {
    const config: Record<string, unknown> = {};

    if (request.systemInstruction) {
      config.systemInstruction = request.systemInstruction;
    }

    if (request.temperature !== undefined) {
      config.temperature = request.temperature;
    }

    if (request.maxOutputTokens !== undefined) {
      config.maxOutputTokens = request.maxOutputTokens;
    }

    if (request.topP !== undefined) {
      config.topP = request.topP;
    }

    if (request.topK !== undefined) {
      config.topK = request.topK;
    }

    if (request.tools && request.tools.length > 0) {
      // Map tools to SDK tool declarations format
      config.tools = request.tools.map((t) => ({
        functionDeclarations: t.functionDeclarations,
      }));
    }

    if (request.toolConfig) {
      config.toolConfig = request.toolConfig;
    }

    return {
      model,
      contents: this.formatContents(request.contents),
      config,
    };
  }

  private formatContents(contents: GoogleAiContent[] | string): unknown {
    if (typeof contents === 'string') {
      return contents;
    }
    return contents.map((c) => ({
      role: c.role,
      parts: c.parts.map((p) => {
        if ('text' in p) return { text: p.text };
        if ('functionCall' in p) return { functionCall: p.functionCall };
        if ('functionResponse' in p) return { functionResponse: p.functionResponse };
        return p;
      }),
    }));
  }

  private extractText(response: any): string | undefined {
    if (typeof response?.text === 'string') {
      return response.text;
    }
    const part = response?.candidates?.[0]?.content?.parts?.[0];
    if (typeof part?.text === 'string') {
      return part.text;
    }
    return undefined;
  }

  private extractFunctionCalls(response: any): GoogleAiFunctionCall[] | undefined {
    if (Array.isArray(response?.functionCalls) && response.functionCalls.length > 0) {
      return response.functionCalls.map((fc: any) => ({
        name: String(fc.name || ''),
        args: fc.args && typeof fc.args === 'object' ? fc.args : {},
      }));
    }

    const parts = response?.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
      const calls: GoogleAiFunctionCall[] = [];
      for (const part of parts) {
        if (part?.functionCall) {
          calls.push({
            name: String(part.functionCall.name || ''),
            args: part.functionCall.args && typeof part.functionCall.args === 'object' ? part.functionCall.args : {},
          });
        }
      }
      if (calls.length > 0) return calls;
    }

    return undefined;
  }

  private extractMetadata(
    response: any,
    model: string,
    latencyMs: number,
    attempts: number,
    requestId?: string
  ): GoogleAiResponseMetadata {
    const usage = response?.usageMetadata;
    const finishReason = response?.candidates?.[0]?.finishReason;

    return {
      model,
      latencyMs,
      promptTokens: usage?.promptTokenCount,
      completionTokens: usage?.candidatesTokenCount,
      totalTokens: usage?.totalTokenCount,
      cachedContentTokens: usage?.cachedContentTokenCount,
      finishReason,
      attempts,
      requestId,
      providerMode: this.mode,
    };
  }

  private calculateBackoff(attempt: number): number {
    const base = this.config.baseRetryDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.floor(Math.random() * 50);
    return Math.min(this.config.maxRetryDelayMs, base + jitter);
  }
}
