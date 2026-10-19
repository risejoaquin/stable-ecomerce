import type { MetaOutboundProvider, MetaProviderResult } from './provider.js';
import type { OutboundDeliveryRecord } from './contracts.js';
import type { OutboundDeliveryRepository } from './repository.js';

export interface DurableOutboundWorkerOptions {
  batchSize?: number;
  maxAttempts?: number;
  now?: () => Date;
}

export interface OutboundWorkerResult {
  claimed: number;
  sent: number;
  retryable: number;
  failed: number;
}

function safeErrorCode(value: unknown): string {
  if (typeof value !== 'string') return 'PROVIDER_FAILURE';
  return value.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 80) || 'PROVIDER_FAILURE';
}

/** Drains only a bounded batch; atomic claim ownership remains in the repository. */
export class DurableOutboundWorker {
  private readonly batchSize: number;
  private readonly maxAttempts: number;
  private readonly now: () => Date;

  constructor(private readonly repository: OutboundDeliveryRepository, private readonly provider: MetaOutboundProvider, options: DurableOutboundWorkerOptions = {}) {
    this.batchSize = Math.max(1, Math.min(100, Math.trunc(options.batchSize ?? 10)));
    this.maxAttempts = Math.max(1, Math.min(10, Math.trunc(options.maxAttempts ?? 3)));
    this.now = options.now ?? (() => new Date());
  }

  async runBatch(): Promise<OutboundWorkerResult> {
    const summary: OutboundWorkerResult = { claimed: 0, sent: 0, retryable: 0, failed: 0 };
    const claimedIds = new Set<string>();
    for (let index = 0; index < this.batchSize; index += 1) {
      const record = await this.repository.claimNext(this.now().toISOString());
      if (!record) break;
      if (claimedIds.has(record.id)) {
        await this.repository.complete(record.id, {
          status: 'RETRYABLE_FAILURE', externalMessageId: null, errorCode: 'BATCH_DEDUPLICATED', now: this.now().toISOString(),
        });
        break;
      }
      claimedIds.add(record.id);
      summary.claimed += 1;
      const result = await this.send(record);
      if (result === 'SENT') summary.sent += 1;
      else if (result === 'RETRYABLE_FAILURE') summary.retryable += 1;
      else summary.failed += 1;
    }
    return summary;
  }

  private async send(record: OutboundDeliveryRecord): Promise<'SENT' | 'RETRYABLE_FAILURE' | 'FAILED'> {
    let result: MetaProviderResult;
    try { result = await this.provider.send(record.message); }
    catch { result = { status: 'FAILED', retryable: true, errorCode: 'PROVIDER_UNAVAILABLE' }; }
    const retryable = result.status !== 'SENT' && result.retryable && record.attemptCount < this.maxAttempts;
    const status = result.status === 'SENT' ? 'SENT' : retryable ? 'RETRYABLE_FAILURE' : 'FAILED';
    await this.repository.complete(record.id, {
      status,
      externalMessageId: result.status === 'SENT' ? result.externalMessageId.trim().slice(0, 200) || null : null,
      errorCode: result.status === 'SENT' ? null : safeErrorCode(result.errorCode),
      now: this.now().toISOString(),
    });
    return status;
  }
}
