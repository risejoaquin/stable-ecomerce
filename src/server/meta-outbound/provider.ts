import type { NormalizedOutboundMessage } from './contracts.js';

export type MetaProviderResult =
  | { status: 'SENT'; externalMessageId: string }
  | { status: 'FAILED'; retryable: boolean; errorCode: string };

/**
 * Deliberately transport-only. Implementations receive no token or secret through
 * this contract; credential loading remains private to a future server-side provider.
 */
export interface MetaOutboundProvider {
  send(message: NormalizedOutboundMessage): Promise<MetaProviderResult>;
}
