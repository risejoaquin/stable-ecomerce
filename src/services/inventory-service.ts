import type { SellableUnit } from '../types/inventory';
import { normalizeBarcode, normalizeSku } from '../utils/sku-helpers';

/** CCP-12 supplies persistence. This contract assumes no deployed table. */
export interface SellableUnitRepository {
  findById(id: string): Promise<SellableUnit | null>;
  findBySku(sku: string): Promise<SellableUnit | null>;
  findByBarcode(barcode: string): Promise<SellableUnit | null>;
}

export interface InventoryResolutionLogger {
  debug(fields: { lookup: 'id' | 'sku' | 'barcode'; found: boolean }, message: string): void;
}

/** Internal application service, not a public/storefront serialization layer. */
export class InventoryService {
  constructor(private readonly repository: SellableUnitRepository, private readonly logger?: InventoryResolutionLogger) {}

  async resolveById(id: string): Promise<SellableUnit | null> {
    if (typeof id !== 'string' || !id.trim()) throw new Error('SellableUnit ID is required');
    const unit = await this.repository.findById(id.trim());
    this.logger?.debug({ lookup: 'id', found: unit !== null }, 'SellableUnit resolution');
    return unit;
  }

  async resolveBySku(sku: string): Promise<SellableUnit | null> {
    const unit = await this.repository.findBySku(normalizeSku(sku));
    this.logger?.debug({ lookup: 'sku', found: unit !== null }, 'SellableUnit resolution');
    return unit;
  }

  async resolveByBarcode(barcode: string): Promise<SellableUnit | null> {
    const unit = await this.repository.findByBarcode(normalizeBarcode(barcode));
    this.logger?.debug({ lookup: 'barcode', found: unit !== null }, 'SellableUnit resolution');
    return unit;
  }
}
