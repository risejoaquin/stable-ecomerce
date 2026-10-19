import type { Product, ProductVariant } from '../../types';
import { BLACK_RELIC_MOCK_CATALOG } from './fixtures/catalog-fixtures';
import { buildMetaCatalogItem, parseMetaContentId } from './meta-catalog-mapper';

function resolveContentId(products: Product[], contentId: string): { product: Product; variant?: ProductVariant } | null {
  const key = parseMetaContentId(contentId).normalizedContentId;
  const matches: Array<{ product: Product; variant?: ProductVariant }> = [];
  const matchesKey = (value: unknown) => typeof value === 'string' && value.length > 0 &&
    parseMetaContentId(value).normalizedContentId === key;
  for (const product of products) {
    if (product.status !== 'active') continue;
    if (matchesKey(product.id) || matchesKey(product.sku) || matchesKey(buildMetaCatalogItem(product).id)) {
      matches.push({ product });
    }
    for (const variant of product.variants ?? []) {
      if (matchesKey(variant.id) || matchesKey(variant.sku) || matchesKey(buildMetaCatalogItem(product, variant).id)) {
        matches.push({ product, variant });
      }
    }
  }
  return matches.length === 1 ? JSON.parse(JSON.stringify(matches[0])) : null;
}

export interface CatalogSearchOptions {
  limit?: number;
  activeOnly?: boolean;
  category?: string;
}

/**
 * Authoritative Catalog Repository Contract.
 * Provides read access to verified products, variants, and stock counts.
 * Invariant: Never invent or mock non-existent inventory on lookup misses.
 */
export interface CatalogRepository {
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string): Promise<Product | null>;
  findBySku(sku: string): Promise<Product | null>;
  findByMetaContentId(contentId: string): Promise<{ product: Product; variant?: ProductVariant } | null>;
  search(query: string, options?: CatalogSearchOptions): Promise<Product[]>;
  listActive(): Promise<Product[]>;
  getStock(productId: string, variantId?: string | null): Promise<number>;
}

/**
 * In-memory implementation of CatalogRepository for tests, staging, and local simulations.
 */
export class InMemoryCatalogRepository implements CatalogRepository {
  private products: Map<string, Product> = new Map();

  constructor(initialProducts: Product[] = BLACK_RELIC_MOCK_CATALOG) {
    for (const p of initialProducts) {
      this.products.set(p.id, JSON.parse(JSON.stringify(p)));
    }
  }

  async findById(id: string): Promise<Product | null> {
    if (!id || typeof id !== 'string') return null;
    const product = this.products.get(id.trim());
    return product ? JSON.parse(JSON.stringify(product)) : null;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    if (!slug || typeof slug !== 'string') return null;
    const clean = slug.trim().toLowerCase();
    for (const p of this.products.values()) {
      if (p.slug && p.slug.trim().toLowerCase() === clean) {
        return JSON.parse(JSON.stringify(p));
      }
    }
    return null;
  }

  async findBySku(sku: string): Promise<Product | null> {
    if (!sku || typeof sku !== 'string') return null;
    const clean = sku.trim().toUpperCase();

    for (const p of this.products.values()) {
      // 1. Check parent product SKU
      if (typeof p.sku === 'string' && p.sku.trim().toUpperCase() === clean) {
        return JSON.parse(JSON.stringify(p));
      }
      // 2. Check variant SKUs
      if (Array.isArray(p.variants)) {
        for (const v of p.variants) {
          if (typeof v.sku === 'string' && v.sku.trim().toUpperCase() === clean) {
            return JSON.parse(JSON.stringify(p));
          }
        }
      }
    }

    return null;
  }

  async findByMetaContentId(contentId: string): Promise<{ product: Product; variant?: ProductVariant } | null> {
    if (!contentId || typeof contentId !== 'string') return null;
    return resolveContentId([...this.products.values()], contentId);
  }

  async search(query: string, options: CatalogSearchOptions = {}): Promise<Product[]> {
    const limit = options.limit ?? 10;
    const activeOnly = options.activeOnly ?? true;
    const clean = (query || '').trim().toLowerCase();

    const matches: Product[] = [];

    for (const p of this.products.values()) {
      if (activeOnly && p.status !== 'active') {
        continue;
      }

      if (options.category && p.category?.toLowerCase() !== options.category.toLowerCase()) {
        const cats = Array.isArray(p.categories) ? p.categories.map((c) => c.toLowerCase()) : [];
        if (!cats.includes(options.category.toLowerCase())) {
          continue;
        }
      }

      if (!clean) {
        matches.push(JSON.parse(JSON.stringify(p)));
        if (matches.length >= limit) break;
        continue;
      }

      const nameMatch = p.name.toLowerCase().includes(clean);
      const slugMatch = p.slug?.toLowerCase().includes(clean);
      const descMatch = typeof p.description === 'string' && p.description.toLowerCase().includes(clean);
      const catMatch = typeof p.category === 'string' && p.category.toLowerCase().includes(clean);
      const skuMatch = typeof p.sku === 'string' && p.sku.toLowerCase().includes(clean);

      // Check variants
      let variantMatch = false;
      if (Array.isArray(p.variants)) {
        variantMatch = p.variants.some((v) =>
          v.name.toLowerCase().includes(clean) ||
          (typeof v.sku === 'string' && v.sku.toLowerCase().includes(clean)),
        );
      }

      if (nameMatch || slugMatch || descMatch || catMatch || skuMatch || variantMatch) {
        matches.push(JSON.parse(JSON.stringify(p)));
        if (matches.length >= limit) break;
      }
    }

    return matches;
  }

  async listActive(): Promise<Product[]> {
    return this.search('', { activeOnly: true, limit: 100 });
  }

  async getStock(productId: string, variantId?: string | null): Promise<number> {
    const product = this.products.get(productId);
    if (!product || product.status !== 'active') {
      return 0; // Invariant: unknown or inactive products strictly have 0 stock
    }

    if (variantId && Array.isArray(product.variants)) {
      const variant = product.variants.find(
        (v) => v.id === variantId || (v.sku && v.sku.toUpperCase() === variantId.toUpperCase()),
      );
      if (!variant) return 0;
      return typeof variant.stock === 'number' && Number.isFinite(variant.stock)
        ? Math.max(0, Math.floor(variant.stock))
        : 0;
    }

    return typeof product.stock === 'number' && Number.isFinite(product.stock)
      ? Math.max(0, Math.floor(product.stock))
      : 0;
  }

  /**
   * Test helper to register or override a product.
   */
  registerProduct(product: Product): void {
    this.products.set(product.id, JSON.parse(JSON.stringify(product)));
  }

  /**
   * Test helper to simulate inventory changes.
   */
  setStock(productId: string, variantId: string | null, stock: number): void {
    const p = this.products.get(productId);
    if (!p) return;
    const safeStock = Math.max(0, Math.floor(stock));
    if (variantId && Array.isArray(p.variants)) {
      const v = p.variants.find((item) => item.id === variantId || item.sku === variantId);
      if (v) {
        v.stock = safeStock;
      }
    } else {
      p.stock = safeStock;
    }
  }
}

/**
 * Supabase adapter implementation for production deployment.
 * Enforces SEC-003 sanitized select queries.
 */
export class SupabaseCatalogAdapter implements CatalogRepository {
  constructor(private readonly supabase: any, private readonly storeSlug: string = 'selfcare-sinners') {}

  async findById(id: string): Promise<Product | null> {
    if (!this.supabase || !id) return null;
    const { data, error } = await this.supabase
      .from('products')
      .select('id,name,slug,description,price,compare_at_price,stock,brand,category,categories,variants,status,images,sku')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async findBySlug(slug: string): Promise<Product | null> {
    if (!this.supabase || !slug) return null;
    const { data, error } = await this.supabase
      .from('products')
      .select('id,name,slug,description,price,compare_at_price,stock,brand,category,categories,variants,status,images,sku')
      .eq('slug', slug.trim())
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async findBySku(sku: string): Promise<Product | null> {
    if (!this.supabase || !sku) return null;
    const { data, error } = await this.supabase
      .from('products')
      .select('id,name,slug,description,price,compare_at_price,stock,brand,category,categories,variants,status,images,sku')
      .eq('sku', sku.trim().toUpperCase())
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async findByMetaContentId(contentId: string): Promise<{ product: Product; variant?: ProductVariant } | null> {
    if (!this.supabase || !contentId) return null;
    const products: Product[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await this.supabase.from('products')
        .select('id,name,slug,description,price,compare_at_price,stock,brand,category,categories,variants,status,images,sku')
        .order('id').range(offset, offset + 999);
      if (error || !data) throw new Error('Catalog content ID lookup unavailable');
      products.push(...data);
      if (data.length < 1000) break;
    }
    return resolveContentId(products, contentId);
  }

  async search(query: string, options: CatalogSearchOptions = {}): Promise<Product[]> {
    if (!this.supabase) return [];
    let builder = this.supabase
      .from('products')
      .select('id,name,slug,description,price,compare_at_price,stock,brand,category,categories,variants,status,images,sku')
      .eq('status', 'active');

    if (query.trim()) {
      builder = builder.ilike('name', `%${query.trim()}%`);
    }

    if (options.limit) {
      builder = builder.limit(options.limit);
    }

    const { data, error } = await builder;
    if (error || !data) return [];
    return data;
  }

  async listActive(): Promise<Product[]> {
    return this.search('', { limit: 100 });
  }

  async getStock(productId: string, variantId?: string | null): Promise<number> {
    const product = await this.findById(productId);
    if (!product || product.status !== 'active') return 0;

    if (variantId && Array.isArray(product.variants)) {
      const v = product.variants.find((item) => item.id === variantId || item.sku === variantId);
      return v && typeof v.stock === 'number' ? Math.max(0, v.stock) : 0;
    }

    return typeof product.stock === 'number' ? Math.max(0, product.stock) : 0;
  }
}
