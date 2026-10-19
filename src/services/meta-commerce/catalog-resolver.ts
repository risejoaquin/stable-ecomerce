import type { Product, ProductVariant } from '../../types';
import type { ConversationState } from '../../types/meta-commerce';
import type { ExtractedEntities } from './intent-types';
import type {
  AlternativeProductOption,
  AuthoritativePrice,
  AuthoritativeStock,
  CatalogProduct,
  CatalogResolutionResult,
  CatalogVariant,
  ProductResolutionCriteria,
  ProductResolutionStatus,
  StockStatus,
} from './catalog-types';
import { ISO_CURRENCY_MXN } from './catalog-types';
import type { CatalogRepository } from './catalog-repository';
import { InMemoryCatalogRepository } from './catalog-repository';
import {
  doColorsMatch,
  doSizesMatch,
  matchProductVariants,
  normalizeColor,
  normalizeSize,
  toCatalogVariant,
} from './variant-matcher';
import { buildMetaCatalogItem } from './meta-catalog-mapper';
import { reduceConversationState } from './conversation-domain';

const LOW_STOCK_THRESHOLD = 3;

/**
 * Formats a currency amount into standard Mexican Peso representation.
 */
export function formatCurrencyMxn(amount: number): string {
  return `$${amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${ISO_CURRENCY_MXN}`;
}

/**
 * Builds authoritative price object from product and optional variant.
 * Enforces zero hallucination invariant: prices must derive exclusively from verified catalog records.
 */
export function buildAuthoritativePrice(
  product: Product | CatalogProduct,
  variant?: ProductVariant | CatalogVariant | null,
): AuthoritativePrice {
  let amount = product.price;

  if (variant && typeof variant.price === 'number' && Number.isFinite(variant.price)) {
    amount = variant.price;
  }

  const compareAt = typeof (product as any).compare_at_price === 'number' && (product as any).compare_at_price > amount
    ? (product as any).compare_at_price
    : (typeof (product as any).compareAtPrice === 'number' && (product as any).compareAtPrice > amount
      ? (product as any).compareAtPrice
      : null);

  const hasDiscount = compareAt !== null && compareAt > amount;
  const discountPercentage = hasDiscount
    ? Math.round(((compareAt - amount) / compareAt) * 100)
    : null;

  return {
    amount,
    currency: ISO_CURRENCY_MXN,
    formatted: formatCurrencyMxn(amount),
    compareAtPrice: compareAt,
    hasDiscount,
    discountPercentage,
  };
}

/**
 * Computes authoritative stock status.
 * Enforces strict zero invented inventory rule: stock must reflect real verified count.
 */
export function computeAuthoritativeStock(
  availableStock: number,
  requestedQuantity: number = 1,
): AuthoritativeStock {
  const safeAvailable = Math.max(0, Math.floor(availableStock));
  const safeRequested = Math.max(1, Math.floor(requestedQuantity));

  let status: StockStatus;
  let isAvailable: boolean;

  if (safeAvailable === 0) {
    status = 'OUT_OF_STOCK';
    isAvailable = false;
  } else if (safeAvailable < safeRequested) {
    status = 'INSUFFICIENT_STOCK';
    isAvailable = false;
  } else if (safeAvailable <= LOW_STOCK_THRESHOLD) {
    status = 'LOW_STOCK';
    isAvailable = true;
  } else {
    status = 'IN_STOCK';
    isAvailable = true;
  }

  return {
    availableStock: safeAvailable,
    status,
    isAvailable,
    requestedQuantity: safeRequested,
    allowBackorder: false,
  };
}

/**
 * Converts a raw Product into a typed CatalogProduct with normalized variants.
 */
export function toCatalogProduct(product: Product): CatalogProduct {
  const defaultSku: string = typeof product.sku === 'string' && product.sku.trim()
    ? product.sku.trim().toUpperCase()
    : `SKU-${product.id.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
  const rawVariants = Array.isArray(product.variants) ? product.variants : [];
  const variants: CatalogVariant[] = rawVariants.map((v) =>
    toCatalogVariant(v, product.id, defaultSku),
  );

  const totalStock = variants.length > 0
    ? variants.reduce((sum, v) => sum + v.stock, 0)
    : (typeof product.stock === 'number' ? Math.max(0, product.stock) : 0);

  const status = product.status === 'active' ? 'active' : (product.status === 'archived' ? 'archived' : 'draft');

  return {
    id: product.id,
    name: product.name,
    slug: product.slug || product.id,
    description: (product as any).description || product.name,
    price: product.price,
    compareAtPrice: (product as any).compare_at_price ?? (product as any).compareAtPrice ?? null,
    stock: totalStock,
    category: (product as any).category || 'general',
    brand: (product as any).brand || 'BLACK RELIC',
    images: Array.isArray(product.images) ? product.images : [],
    variants,
    isAvailable: totalStock > 0 && status === 'active',
    defaultSku,
    status,
  };
}

/**
 * Catalog & Stock Resolver Service.
 * Connects Meta Commerce conversation engine to authoritative product, variant, and inventory abstractions.
 */
export class CatalogResolver {
  constructor(private readonly repository: CatalogRepository = new InMemoryCatalogRepository()) {}

  /**
   * Resolves product, variant, authoritative pricing, and stock based on search criteria.
   */
  async resolveProduct(criteria: ProductResolutionCriteria): Promise<CatalogResolutionResult> {
    const requestedQuantity = criteria.quantity && criteria.quantity > 0 ? criteria.quantity : 1;
    let rawProduct: Product | null = null;
    let preMatchedVariant: ProductVariant | null = null;

    // 1. Resolution by Meta Content ID (from CAPI or Instagram Shop stickers/tags)
    if (criteria.metaContentId) {
      const match = await this.repository.findByMetaContentId(criteria.metaContentId);
      if (match) {
        rawProduct = match.product;
        if (match.variant) {
          preMatchedVariant = match.variant;
        }
      }
    }

    // 2. Resolution by explicit Product ID
    if (!rawProduct && criteria.productId) {
      rawProduct = await this.repository.findById(criteria.productId);
    }

    // 3. Resolution by SKU
    if (!rawProduct && criteria.sku) {
      rawProduct = await this.repository.findBySku(criteria.sku);
    }

    // 4. Resolution by Slug
    if (!rawProduct && criteria.slug) {
      rawProduct = await this.repository.findBySlug(criteria.slug);
    }

    // 5. Resolution by Product Mention / Keyword search
    if (!rawProduct && criteria.mention) {
      const searchResults = await this.repository.search(criteria.mention, { activeOnly: true, limit: 5 });
      if (searchResults.length > 0) {
        rawProduct = searchResults[0];
      }
    }

    // Case: Product Not Found
    if (!rawProduct || rawProduct.status !== 'active') {
      const alternatives = await this.findTopInStockAlternatives(3);
      return {
        status: 'PRODUCT_NOT_FOUND',
        product: null,
        variant: null,
        price: null,
        stock: null,
        availableVariants: [],
        availableSizes: [],
        availableColors: [],
        alternatives,
        metaMapping: null,
        conversationalSummary: 'No pudimos encontrar el producto solicitado en nuestro catálogo. Te invitamos a conocer nuestras piezas más populares disponibles en BLACK RELIC.',
        requiresClarification: true,
        clarificationPrompt: '¿Te gustaría ver alguno de nuestros productos más vendidos?',
      };
    }

    const catalogProduct = toCatalogProduct(rawProduct);
    const variants = catalogProduct.variants;

    // Case: Product Has No Variants (Sellable unit is the product itself)
    if (variants.length === 0) {
      const price = buildAuthoritativePrice(catalogProduct, null);
      const stock = computeAuthoritativeStock(catalogProduct.stock, requestedQuantity);
      const metaMapping = buildMetaCatalogItem(catalogProduct, null);

      if (!stock.isAvailable) {
        const alternatives = await this.findCategoryAlternatives(catalogProduct, 3);
        return {
          status: 'OUT_OF_STOCK',
          product: catalogProduct,
          variant: null,
          price,
          stock,
          availableVariants: [],
          availableSizes: [],
          availableColors: [],
          alternatives,
          metaMapping,
          conversationalSummary: `El producto ${catalogProduct.name} se encuentra temporalmente agotado.`,
          requiresClarification: true,
          clarificationPrompt: '¿Te gustaría ver productos similares disponibles en la misma categoría?',
        };
      }

      return {
        status: 'RESOLVED',
        product: catalogProduct,
        variant: null,
        price,
        stock,
        availableVariants: [],
        availableSizes: [],
        availableColors: [],
        alternatives: [],
        metaMapping,
        conversationalSummary: `Tenemos disponible ${catalogProduct.name} por ${price.formatted}${stock.status === 'LOW_STOCK' ? ` (¡Solo quedan ${stock.availableStock} piezas!)` : ''}.`,
        requiresClarification: false,
      };
    }

    // Product has variants: proceed to variant resolution
    const {
      exactMatch,
      matchingVariants,
      availableSizesForColor,
      availableColorsForSize,
      allAvailableSizes,
      allAvailableColors,
    } = matchProductVariants(variants, criteria.size, criteria.color);

    // Resolve pre-matched variant if coming from Meta Content ID
    let resolvedVariant: CatalogVariant | null = exactMatch;
    if (!resolvedVariant && preMatchedVariant) {
      resolvedVariant = variants.find((v) => v.id === preMatchedVariant?.id || v.sku === preMatchedVariant?.sku) || null;
    }

    // 1. Exact Variant Match Resolved
    if (resolvedVariant) {
      const price = buildAuthoritativePrice(catalogProduct, resolvedVariant);
      const stock = computeAuthoritativeStock(resolvedVariant.stock, requestedQuantity);
      const metaMapping = buildMetaCatalogItem(catalogProduct, resolvedVariant);

      // Handle Out Of Stock on exact variant
      if (!stock.isAvailable) {
        const alternatives = await this.findVariantAlternatives(
          catalogProduct,
          resolvedVariant,
          allAvailableSizes,
          allAvailableColors,
        );

        let oosMessage = `La talla ${resolvedVariant.size || ''}${resolvedVariant.color ? ` en color ${resolvedVariant.color}` : ''} de ${catalogProduct.name} está temporalmente agotada.`;
        if (stock.status === 'INSUFFICIENT_STOCK') {
          oosMessage = `Solo tenemos ${stock.availableStock} pieza(s) disponible(s) de ${catalogProduct.name} en ${resolvedVariant.name}, pero solicitaste ${requestedQuantity}.`;
        }

        return {
          status: 'OUT_OF_STOCK',
          product: catalogProduct,
          variant: resolvedVariant,
          price,
          stock,
          availableVariants: variants.filter((v) => v.stock > 0),
          availableSizes: allAvailableSizes,
          availableColors: allAvailableColors,
          alternatives,
          metaMapping,
          conversationalSummary: oosMessage,
          requiresClarification: true,
          clarificationPrompt: alternatives.length > 0
            ? '¿Te gustaría ordenar en otra talla o color disponible?'
            : '¿Te gustaría ver alternativas similares en stock?',
        };
      }

      // Exact Variant In Stock
      const lowStockMsg = stock.status === 'LOW_STOCK' ? ` (¡Solo quedan ${stock.availableStock} piezas disponibles!)` : '';
      return {
        status: 'RESOLVED',
        product: catalogProduct,
        variant: resolvedVariant,
        price,
        stock,
        availableVariants: variants.filter((v) => v.stock > 0),
        availableSizes: allAvailableSizes,
        availableColors: allAvailableColors,
        alternatives: [],
        metaMapping,
        conversationalSummary: `Tenemos disponible ${catalogProduct.name} (${resolvedVariant.name}) por ${price.formatted}${lowStockMsg}.`,
        requiresClarification: false,
      };
    }

    // 2. User specified criteria, but no such variant exists in catalog
    if (criteria.size || criteria.color) {
      const alternatives = await this.findVariantAlternatives(
        catalogProduct,
        null,
        allAvailableSizes,
        allAvailableColors,
      );

      const requestedParts: string[] = [];
      if (criteria.size) requestedParts.push(`talla ${criteria.size}`);
      if (criteria.color) requestedParts.push(`color ${criteria.color}`);

      return {
        status: 'VARIANT_NOT_FOUND',
        product: catalogProduct,
        variant: null,
        price: buildAuthoritativePrice(catalogProduct, null),
        stock: computeAuthoritativeStock(0, requestedQuantity),
        availableVariants: variants.filter((v) => v.stock > 0),
        availableSizes: allAvailableSizes,
        availableColors: allAvailableColors,
        alternatives,
        metaMapping: buildMetaCatalogItem(catalogProduct, null),
        conversationalSummary: `No contamos con ${catalogProduct.name} en ${requestedParts.join(' ')}.`,
        requiresClarification: true,
        clarificationPrompt: allAvailableSizes.length > 0 || allAvailableColors.length > 0
          ? `Las opciones disponibles en stock son: ${[
              allAvailableColors.length > 0 ? `Colores: ${allAvailableColors.join(', ')}` : '',
              allAvailableSizes.length > 0 ? `Tallas: ${allAvailableSizes.join(', ')}` : '',
            ].filter(Boolean).join(' | ')}. ¿Cuál prefieres?`
          : 'Actualmente no hay variantes disponibles de este producto.',
      };
    }

    // 3. User requested product, but variant selection (size/color) is required
    const price = buildAuthoritativePrice(catalogProduct, null);
    const inStockVariants = variants.filter((v) => v.stock > 0);
    const metaMapping = buildMetaCatalogItem(catalogProduct, null);

    if (inStockVariants.length === 0) {
      // All variants are out of stock
      const alternatives = await this.findCategoryAlternatives(catalogProduct, 3);
      return {
        status: 'OUT_OF_STOCK',
        product: catalogProduct,
        variant: null,
        price,
        stock: computeAuthoritativeStock(0, requestedQuantity),
        availableVariants: [],
        availableSizes: [],
        availableColors: [],
        alternatives,
        metaMapping,
        conversationalSummary: `Todas las tallas de ${catalogProduct.name} están agotadas en este momento.`,
        requiresClarification: true,
        clarificationPrompt: '¿Te gustaría ver otras prendas similares en nuestro catálogo?',
      };
    }

    return {
      status: 'VARIANT_SELECTION_REQUIRED',
      product: catalogProduct,
      variant: null,
      price,
      stock: computeAuthoritativeStock(catalogProduct.stock, requestedQuantity),
      availableVariants: inStockVariants,
      availableSizes: allAvailableSizes,
      availableColors: allAvailableColors,
      alternatives: [],
      metaMapping,
      conversationalSummary: `${catalogProduct.name} tiene un precio de ${price.formatted}.`,
      requiresClarification: true,
      clarificationPrompt: `¿Qué talla y color te gustaría? Opciones disponibles en stock: ${[
        allAvailableColors.length > 0 ? `Colores: ${allAvailableColors.join(', ')}` : '',
        allAvailableSizes.length > 0 ? `Tallas: ${allAvailableSizes.join(', ')}` : '',
      ].filter(Boolean).join(' | ')}.`,
    };
  }

  /**
   * Connects conversation state and extracted entities from intent routing to authoritative catalog resolution.
   */
  async resolveFromConversation(
    state: ConversationState,
    entities?: ExtractedEntities | null,
  ): Promise<CatalogResolutionResult> {
    const criteria: ProductResolutionCriteria = {
      productId: state.current_product_id,
      slug: null,
      sku: null,
      mention: entities?.productMention || null,
      size: entities?.size || null,
      color: entities?.color || null,
      quantity: entities?.quantity || state.quantity || 1,
      metaContentId: null,
    };

    return this.resolveProduct(criteria);
  }

  /**
   * Applies a successful product and variant resolution to the ConversationState.
   */
  applyResolutionToState(state: ConversationState, result: CatalogResolutionResult): ConversationState {
    let nextState = { ...state };

    if (result.product) {
      nextState = reduceConversationState(nextState, {
        type: 'PRODUCT_SELECTED',
        productId: result.product.id,
        variantId: result.variant?.id || null,
        quantity: result.stock?.requestedQuantity || nextState.quantity,
      });
    }

    if (result.variant) {
      nextState = reduceConversationState(nextState, {
        type: 'VARIANT_SELECTED',
        variantId: result.variant.id,
      });
    }

    return nextState;
  }

  // --------------------------------------------------------------------------
  // Private Helper: Real In-Stock Alternative Finders (Strict Invariant Enforced)
  // --------------------------------------------------------------------------

  private async findVariantAlternatives(
    product: CatalogProduct,
    unavailableVariant: CatalogVariant | null,
    allAvailableSizes: string[],
    allAvailableColors: string[],
  ): Promise<AlternativeProductOption[]> {
    const alternatives: AlternativeProductOption[] = [];

    // 1. Same product, other available sizes in same requested color
    if (unavailableVariant?.color) {
      const sameColorOtherSizes = product.variants.filter(
        (v) => v.stock > 0 && doColorsMatch(unavailableVariant.color, v.color) && v.size !== unavailableVariant.size,
      );
      for (const v of sameColorOtherSizes) {
        alternatives.push({
          productId: product.id,
          productName: product.name,
          slug: product.slug,
          price: buildAuthoritativePrice(product, v),
          variantId: v.id,
          variantTitle: v.name,
          size: v.size,
          color: v.color,
          availableStock: v.stock,
          reason: 'same_product_other_size',
          reasonDescription: `Mismo modelo en color ${v.color}, disponible en talla ${v.size} (${v.stock} piezas).`,
        });
      }
    }

    // 2. Same product, other available colors in same requested size
    if (unavailableVariant?.size) {
      const sameSizeOtherColors = product.variants.filter(
        (v) => v.stock > 0 && doSizesMatch(unavailableVariant.size, v.size) && v.color !== unavailableVariant.color,
      );
      for (const v of sameSizeOtherColors) {
        alternatives.push({
          productId: product.id,
          productName: product.name,
          slug: product.slug,
          price: buildAuthoritativePrice(product, v),
          variantId: v.id,
          variantTitle: v.name,
          size: v.size,
          color: v.color,
          availableStock: v.stock,
          reason: 'same_product_other_color',
          reasonDescription: `Mismo modelo en talla ${v.size}, disponible en color ${v.color} (${v.stock} piezas).`,
        });
      }
    }

    // 3. Fallback: Category alternatives if same-product options are scarce
    if (alternatives.length < 3) {
      const catAlternatives = await this.findCategoryAlternatives(product, 3 - alternatives.length);
      alternatives.push(...catAlternatives);
    }

    return alternatives.slice(0, 4);
  }

  private async findCategoryAlternatives(
    product: CatalogProduct,
    limit: number,
  ): Promise<AlternativeProductOption[]> {
    const activeProducts = await this.repository.listActive();
    const alternatives: AlternativeProductOption[] = [];

    for (const p of activeProducts) {
      if (p.id === product.id) continue;

      const sameCategory = p.category && product.category && p.category.toLowerCase() === product.category.toLowerCase();
      if (!sameCategory) continue;

      const catProd = toCatalogProduct(p);
      const inStockVariants = catProd.variants.filter((v) => v.stock > 0);

      if (inStockVariants.length > 0) {
        const firstVariant = inStockVariants[0];
        alternatives.push({
          productId: catProd.id,
          productName: catProd.name,
          slug: catProd.slug,
          price: buildAuthoritativePrice(catProd, firstVariant),
          variantId: firstVariant.id,
          variantTitle: firstVariant.name,
          size: firstVariant.size,
          color: firstVariant.color,
          availableStock: firstVariant.stock,
          reason: 'same_category_alternative',
          reasonDescription: `Alternativa en la categoría ${catProd.category}: ${catProd.name} (${firstVariant.name}).`,
        });
      } else if (catProd.variants.length === 0 && catProd.stock > 0) {
        alternatives.push({
          productId: catProd.id,
          productName: catProd.name,
          slug: catProd.slug,
          price: buildAuthoritativePrice(catProd, null),
          variantId: null,
          variantTitle: null,
          size: null,
          color: null,
          availableStock: catProd.stock,
          reason: 'same_category_alternative',
          reasonDescription: `Alternativa en la categoría ${catProd.category}: ${catProd.name}.`,
        });
      }

      if (alternatives.length >= limit) break;
    }

    // If still under limit, fill with top in-stock products
    if (alternatives.length < limit) {
      const topAlternatives = await this.findTopInStockAlternatives(limit - alternatives.length, [product.id, ...alternatives.map((a) => a.productId)]);
      alternatives.push(...topAlternatives);
    }

    return alternatives;
  }

  private async findTopInStockAlternatives(
    limit: number,
    excludeIds: string[] = [],
  ): Promise<AlternativeProductOption[]> {
    const activeProducts = await this.repository.listActive();
    const alternatives: AlternativeProductOption[] = [];

    for (const p of activeProducts) {
      if (excludeIds.includes(p.id)) continue;
      const catProd = toCatalogProduct(p);
      const inStockVariants = catProd.variants.filter((v) => v.stock > 0);

      if (inStockVariants.length > 0) {
        const v = inStockVariants[0];
        alternatives.push({
          productId: catProd.id,
          productName: catProd.name,
          slug: catProd.slug,
          price: buildAuthoritativePrice(catProd, v),
          variantId: v.id,
          variantTitle: v.name,
          size: v.size,
          color: v.color,
          availableStock: v.stock,
          reason: 'featured_alternative',
          reasonDescription: `Pieza destacada disponible en catálogo: ${catProd.name}.`,
        });
      } else if (catProd.variants.length === 0 && catProd.stock > 0) {
        alternatives.push({
          productId: catProd.id,
          productName: catProd.name,
          slug: catProd.slug,
          price: buildAuthoritativePrice(catProd, null),
          variantId: null,
          variantTitle: null,
          size: null,
          color: null,
          availableStock: catProd.stock,
          reason: 'featured_alternative',
          reasonDescription: `Pieza destacada disponible en catálogo: ${catProd.name}.`,
        });
      }

      if (alternatives.length >= limit) break;
    }

    return alternatives;
  }
}
