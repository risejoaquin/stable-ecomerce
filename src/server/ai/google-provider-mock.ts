/**
 * Google AI Customer Care - Mock/Fake Provider Adapter
 *
 * Implements the GoogleAiProvider interface for testing and local CI environments.
 * Guarantees zero network calls to external Google APIs.
 * Supports programmable response queues, error simulation, tool/function call mocking,
 * and call history inspection.
 */

import type {
  GoogleAiGenerateRequest,
  GoogleAiGenerateResponse,
  GoogleAiHealthResult,
  GoogleAiProvider,
  GoogleAiProviderConfig,
  GoogleAiProviderMode,
  GoogleAiRequestOptions,
  GoogleAiResponseMetadata,
} from './google-provider-types.js';
import { assertServerOnly, DEFAULT_GOOGLE_AI_MODEL } from './google-provider-config.js';

export interface MockCallRecord {
  request: GoogleAiGenerateRequest;
  options?: GoogleAiRequestOptions;
  timestamp: number;
}

export class GoogleAiMockProvider implements GoogleAiProvider {
  readonly mode: GoogleAiProviderMode = 'mock';
  private model: string;
  private responseQueue: GoogleAiGenerateResponse[] = [];
  private errorQueue: Error[] = [];
  private callHistory: MockCallRecord[] = [];
  private simulatedLatencyMs = 0;
  private defaultResponseText = 'Mock response from Google Gemini AI assistant.';

  constructor(configOverrides?: Partial<GoogleAiProviderConfig>) {
    assertServerOnly();
    this.model = configOverrides?.model || process.env.GOOGLE_AI_MODEL || DEFAULT_GOOGLE_AI_MODEL;
  }

  getModel(): string {
    return this.model;
  }

  setModel(model: string): void {
    this.model = model;
  }

  setSimulatedLatency(ms: number): void {
    this.simulatedLatencyMs = Math.max(0, ms);
  }

  setDefaultResponse(text: string): void {
    this.defaultResponseText = text;
  }

  queueResponse(response: Partial<GoogleAiGenerateResponse>): void {
    const fullResponse: GoogleAiGenerateResponse = {
      text: response.text,
      functionCalls: response.functionCalls,
      metadata: response.metadata ?? {
        model: this.model,
        latencyMs: this.simulatedLatencyMs,
        promptTokens: 15,
        completionTokens: 25,
        totalTokens: 40,
        finishReason: 'STOP',
        attempts: 1,
        providerMode: 'mock',
      },
    };
    this.responseQueue.push(fullResponse);
  }

  queueError(error: Error): void {
    this.errorQueue.push(error);
  }

  getCallHistory(): MockCallRecord[] {
    return [...this.callHistory];
  }

  getCallCount(): number {
    return this.callHistory.length;
  }

  clearCallHistory(): void {
    this.callHistory = [];
  }

  clearQueues(): void {
    this.responseQueue = [];
    this.errorQueue = [];
  }

  async generate(
    request: GoogleAiGenerateRequest,
    options?: GoogleAiRequestOptions
  ): Promise<GoogleAiGenerateResponse> {
    assertServerOnly();

    this.callHistory.push({
      request,
      options,
      timestamp: Date.now(),
    });

    if (this.simulatedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.simulatedLatencyMs));
    }

    if (options?.signal?.aborted) {
      throw new Error('Google AI mock request aborted by signal');
    }

    if (this.errorQueue.length > 0) {
      const error = this.errorQueue.shift()!;
      throw error;
    }

    if (this.responseQueue.length > 0) {
      const queued = this.responseQueue.shift()!;
      if (options?.requestId && queued.metadata) {
        queued.metadata.requestId = options.requestId;
      }
      return queued;
    }

    const metadata: GoogleAiResponseMetadata = {
      model: options?.model || request.model || this.model,
      latencyMs: this.simulatedLatencyMs,
      promptTokens: 20,
      completionTokens: 30,
      totalTokens: 50,
      finishReason: 'STOP',
      attempts: 1,
      requestId: options?.requestId,
      providerMode: this.mode,
    };

    return {
      text: this.defaultResponseText,
      metadata,
    };
  }

  async healthCheck(): Promise<GoogleAiHealthResult> {
    assertServerOnly();
    return {
      status: 'healthy',
      provider: 'google-genai',
      model: this.model,
      mode: this.mode,
      latencyMs: 0,
    };
  }
}
