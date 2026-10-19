/**
 * Google AI Customer Care - Server-Only Google Gemini Provider Entry Point
 *
 * Provides factory functions, interfaces, error classes, configurations,
 * and adapters for Google Gemini reasoning in RELIC customer care.
 */

import type {
  GoogleAiDependencies,
  GoogleAiProvider,
  GoogleAiProviderConfig,
} from './google-provider-types.js';
import { assertServerOnly, resolveGoogleAiConfig } from './google-provider-config.js';
import { GoogleAiSdkAdapter } from './google-provider-adapter.js';
import { GoogleAiMockProvider } from './google-provider-mock.js';

export * from './google-provider-types.js';
export * from './google-provider-errors.js';
export * from './google-provider-config.js';
export * from './google-provider-adapter.js';
export * from './google-provider-mock.js';
export * from './black-relic-sales-runtime.js';

/**
 * Factory for creating a GoogleAiProvider instance.
 * Automatically chooses between real SDK adapter and mock provider based on
 * configuration/environment, or can be explicitly controlled via options.
 */
export function createGoogleAiProvider(
  configOverrides?: Partial<GoogleAiProviderConfig>,
  dependencies?: GoogleAiDependencies
): GoogleAiProvider {
  assertServerOnly();

  // If dependency injection provides a custom client or mode is mock, resolve accordingly
  const config = resolveGoogleAiConfig(configOverrides);

  if (config.mode === 'mock') {
    return new GoogleAiMockProvider(configOverrides);
  }

  return new GoogleAiSdkAdapter(configOverrides, dependencies);
}
