import { z } from 'zod';
import type { Product, ProductVariant } from '../../types';
import type { SellableUnit } from '../../types/inventory';

/**
 * Standard ISO 4217 currency for Mexican retail commerce.
 */
export const ISO_CURRENCY_MXN = 'MXN' as const;
export type IsoCurrency = typeof ISO_CURRENCY_MXN | string;

/**
 * Stock availability statuses.
 */
export const StockStatusSchema = z.enum([
  'IN_STOCK',
  'LOW_STOCK',
  'OUT_OF_STOCK',
  'INSUFFICIENT_STOCK',
]);
export type StockStatus = z.infer<typeof StockStatusSchema>;

/**
 * Product & variant resolution statuses.
 */
export const ProductResolutionStatusSchema = z.enum([
  'RESOLVED',                     // Product and exact variant identified and verified
  'VARIANT_SELECTION_REQUIRED',  // Product identified, but user needs to select size/color
  'VARIANT_NOT_FOUND',           // Product identified, but requested size/color does not exist in catalog
  'PRODUCT_NOT_FOUND',           // No product found matching the criteria
  'OUT_OF_STOCK',                // Product or exact variant exists but is completely out of stock
]);
export type ProductResolutionStatus = z.infer<typeof ProductResolutionStatusSchema>;

/**
 * Authoritative pricing contract.
 * Strictly computed from verified catalog/variant data; never hallucinated or overridden by LLM.
 */
export const AuthoritativePriceSchema = z.object({
  amount: z.number().finite().nonnegative(),
  currency: z.string().default(ISO_CURRENCY_MXN),
  formatted: z.string(),
  compareAtPrice: z.number().finite().nonnegative().nullable(),
  hasDiscount: z.boolean(),
  discountPercentage: z.number().nullable(),
});
export type AuthoritativePrice = z.infer<typeof AuthoritativePriceSchema>;

/**
 * Authoritative stock contract.
 * Strictly reflects verified inventory counts; no invented inventory permitted.
 */
export const AuthoritativeStockSchema = z.object({
  availableStock: z.number().int().nonnegative(),
  status: StockStatusSchema,
  isAvailable: z.boolean(),
  requestedQuantity: z.number().int().min(1),
  allowBackorder: z.literal(false).default(false), // STRICT: Never allow backorder or invented stock
});
export type AuthoritativeStock = z.infer<typeof AuthoritativeStockSchema>;

/**
 * Normalized variant representation within catalog resolution.
 */
export interface CatalogVariant {
  id: string;
  productId: string;
  sku: string;
  name: string;
  size: string | null;
  color: string | null;
  attributes: Record<string, string>;
  price: number | null; // null if inherits from parent product
  stock: number;
  isAvailable: boolean;
  barcode?: string | null;
}

/**
 * Normalized product representation within catalog resolution.
 */
export interface CatalogProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  category: string;
  brand: string;
  images: string[];
  variants: CatalogVariant[];
  isAvailable: boolean;
  defaultSku: string;
  status: 'active' | 'archived' | 'draft';
}

/**
 * Alternative product option proposed when requested item is OOS or unavailable.
 * STRICT INVARIANT: Alternatives must ONLY be generated from real, verified in-stock catalog items.
 */
export interface AlternativeProductOption {
  productId: string;
  productName: string;
  slug: string;
  price: AuthoritativePrice;
  variantId: string | null;
  variantTitle: string | null;
  size: string | null;
  color: string | null;
  availableStock: number;
  reason:
    | 'same_product_other_size'
    | 'same_product_other_color'
    | 'same_category_alternative'
    | 'featured_alternative';
  reasonDescription: string;
}

/**
 * Meta Catalog & Conversions API (CAPI) compatible mapping item.
 * Guarantees stable IDs across Instagram Shop, Product Tags, and CAPI events.
 */
export interface MetaCatalogItem {
  id: string;               // Stable Content ID: variant SKU or product SKU
  item_group_id: string;    // Parent grouping ID: product ID or parent SKU
  title: string;            // Item title (e.g., "BLACK RELIC Heavyweight Hoodie - Negro / M")
  description: string;
  availability: 'in stock' | 'out of stock';
  condition: 'new';
  price: string;            // Standard Meta decimal string, e.g. "1499.00"
  currency: string;         // Standard ISO 4217, e.g. "MXN"
  link: string;             // Canonical PDP URL
  image_link: string;       // Primary image URL
  brand: string;            // Brand identifier, e.g. "BLACK RELIC"
  size?: string;
  color?: string;
}

/**
 * Complete result of a catalog & stock resolution attempt.
 */
export interface CatalogResolutionResult {
  status: ProductResolutionStatus;
  product: CatalogProduct | null;
  variant: CatalogVariant | null;
  price: AuthoritativePrice | null;
  stock: AuthoritativeStock | null;
  availableVariants: CatalogVariant[];
  availableSizes: string[];
  availableColors: string[];
  alternatives: AlternativeProductOption[];
  metaMapping: MetaCatalogItem | null;
  conversationalSummary: string;
  requiresClarification: boolean;
  clarificationPrompt?: string;
}

/**
 * Search & resolution criteria passed to the resolver.
 */
export interface ProductResolutionCriteria {
  productId?: string | null;
  slug?: string | null;
  sku?: string | null;
  mention?: string | null;
  size?: string | null;
  color?: string | null;
  quantity?: number | null;
  metaContentId?: string | null;
}
