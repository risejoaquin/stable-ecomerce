/**
 * Google AI Customer Care - Provider Types
 *
 * Strongly-typed contracts for the Google Gemini server-only adapter.
 * Designed for dependency injection so business logic and orchestrator
 * layers depend only on abstractions, not direct vendor SDKs.
 */

export type GoogleAiProviderMode = 'real' | 'mock';

export type GoogleAiRole = 'user' | 'model' | 'system' | 'tool';

export interface GoogleAiFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface GoogleAiFunctionResponse {
  name: string;
  response: Record<string, unknown>;
}

export type GoogleAiPart =
  | { text: string }
  | { functionCall: GoogleAiFunctionCall }
  | { functionResponse: GoogleAiFunctionResponse };

export interface GoogleAiContent {
  role: GoogleAiRole;
  parts: GoogleAiPart[];
}

export interface GoogleAiFunctionDeclaration {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface GoogleAiTool {
  functionDeclarations?: GoogleAiFunctionDeclaration[];
}

export interface GoogleAiToolConfig {
  functionCallingConfig?: {
    mode?: 'AUTO' | 'ANY' | 'NONE';
    allowedFunctionNames?: string[];
  };
}

export interface GoogleAiGenerateRequest {
  contents: GoogleAiContent[] | string;
  systemInstruction?: string | GoogleAiPart[];
  tools?: GoogleAiTool[];
  toolConfig?: GoogleAiToolConfig;
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  model?: string;
}

export interface GoogleAiResponseMetadata {
  model: string;
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedContentTokens?: number;
  finishReason?: string;
  attempts: number;
  requestId?: string;
  providerMode: GoogleAiProviderMode;
}

export interface GoogleAiGenerateResponse {
  text?: string;
  functionCalls?: GoogleAiFunctionCall[];
  metadata: GoogleAiResponseMetadata;
}

export interface GoogleAiHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  provider: 'google-genai';
  model: string;
  mode: GoogleAiProviderMode;
  latencyMs?: number;
  error?: string;
}

export interface GoogleAiRequestOptions {
  timeoutMs?: number;
  maxRetries?: number;
  signal?: AbortSignal;
  requestId?: string;
  model?: string;
}

export interface GoogleAiProviderConfig {
  apiKey?: string;
  model?: string;
  mode?: GoogleAiProviderMode;
  timeoutMs?: number;
  maxRetries?: number;
  baseRetryDelayMs?: number;
  maxRetryDelayMs?: number;
}

export interface ResolvedGoogleAiConfig {
  apiKey: string;
  model: string;
  mode: GoogleAiProviderMode;
  timeoutMs: number;
  maxRetries: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
}

export interface GoogleAiLogger {
  debug(data: Record<string, unknown>, message?: string): void;
  info(data: Record<string, unknown>, message?: string): void;
  warn(data: Record<string, unknown>, message?: string): void;
  error(data: Record<string, unknown>, message?: string): void;
}

export interface GoogleAiDependencies {
  client?: unknown; // Injected GoogleGenAI instance for testing
  logger?: GoogleAiLogger;
  sleep?: (ms: number) => Promise<void>;
}

export interface GoogleAiProvider {
  readonly mode: GoogleAiProviderMode;
  getModel(): string;
  generate(request: GoogleAiGenerateRequest, options?: GoogleAiRequestOptions): Promise<GoogleAiGenerateResponse>;
  healthCheck(): Promise<GoogleAiHealthResult>;
}
