import type { ProductVariant } from '../../types';
import type { CatalogVariant } from './catalog-types';

/**
 * Size alias mappings: maps common Mexican Spanish and international size representations
 * to canonical size keys for deterministic matching.
 */
const SIZE_ALIAS_MAP: Record<string, string[]> = {
  'XS': ['xs', 'extra chica', 'extra chico', 'extrachica', 'extrachico'],
  'S': ['s', 'ch', 'chica', 'chico', 'small'],
  'M': ['m', 'med', 'mediana', 'mediano', 'medium'],
  'L': ['l', 'g', 'gde', 'grande', 'large'],
  'XL': ['xl', 'xg', 'extra grande', 'extragrande'],
  '2XL': ['2xl', 'xxl', 'xxg', 'doble extra grande'],
  '3XL': ['3xl', 'xxxl', 'xxxg', 'triple extra grande'],
  'Unitalla': ['unitalla', 'unica', 'unico', 'one size', 'os', 'u'],
};

/**
 * Canonical color normalization map extending Spanish retail terms with English synonyms.
 */
const COLOR_ALIAS_MAP: Record<string, string> = {
  // Spanish
  negro: 'negro',
  negra: 'negro',
  negras: 'negro',
  negros: 'negro',
  blanco: 'blanco',
  blanca: 'blanco',
  blancos: 'blanco',
  blancas: 'blanco',
  gris: 'gris',
  grises: 'gris',
  azul: 'azul',
  azules: 'azul',
  rojo: 'rojo',
  roja: 'rojo',
  rojos: 'rojo',
  rojas: 'rojo',
  verde: 'verde',
  verdes: 'verde',
  beige: 'beige',
  cafe: 'cafe',
  morado: 'morado',
  morada: 'morado',
  vino: 'vino',
  tinto: 'vino',
  plata: 'plata',
  plateado: 'plata',
  plateada: 'plata',
  dorado: 'dorado',
  dorada: 'dorado',
  oro: 'dorado',
  // English synonyms
  black: 'negro',
  white: 'blanco',
  gray: 'gris',
  grey: 'gris',
  blue: 'azul',
  red: 'rojo',
  green: 'verde',
  sand: 'beige',
  silver: 'plata',
  gold: 'dorado',
  burgundy: 'vino',
};

/**
 * Normalizes an arbitrary size string to a comparable canonical representation.
 */
export function normalizeSize(rawSize: string | null | undefined): string | null {
  if (!rawSize || typeof rawSize !== 'string') return null;
  const clean = rawSize.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (!clean) return null;

  // Direct numeric sizes (e.g. waist sizes '28', '30', '32', etc. or lengths '50cm', '60cm')
  if (/^\d{2,3}(?:cm)?$/i.test(clean)) {
    return clean.toUpperCase();
  }

  // Check alias map
  for (const [canonical, aliases] of Object.entries(SIZE_ALIAS_MAP)) {
    if (clean === canonical.toLowerCase() || aliases.includes(clean)) {
      return canonical;
    }
  }

  // Fallback to uppercase trimmed string
  return rawSize.trim().toUpperCase();
}

/**
 * Determines whether two size representations match (e.g. 'CH' matches 'S' or 'CH').
 */
export function doSizesMatch(requestedSize: string | null | undefined, variantSize: string | null | undefined): boolean {
  if (!requestedSize || !variantSize) return false;
  const normRequested = normalizeSize(requestedSize);
  const normVariant = normalizeSize(variantSize);

  if (normRequested === normVariant) return true;

  // Allow CH / S equivalence explicitly
  const isRequestedSmall = normRequested === 'S' || requestedSize.trim().toUpperCase() === 'CH';
  const isVariantSmall = normVariant === 'S' || variantSize.trim().toUpperCase() === 'CH';
  if (isRequestedSmall && isVariantSmall) return true;

  // Allow G / L equivalence explicitly
  const isRequestedLarge = normRequested === 'L' || requestedSize.trim().toUpperCase() === 'G';
  const isVariantLarge = normVariant === 'L' || variantSize.trim().toUpperCase() === 'G';
  if (isRequestedLarge && isVariantLarge) return true;

  // Allow XG / XL equivalence explicitly
  const isRequestedXL = normRequested === 'XL' || requestedSize.trim().toUpperCase() === 'XG';
  const isVariantXL = normVariant === 'XL' || variantSize.trim().toUpperCase() === 'XG';
  if (isRequestedXL && isVariantXL) return true;

  return false;
}

/**
 * Normalizes an arbitrary color string to canonical Spanish color.
 */
export function normalizeColor(rawColor: string | null | undefined): string | null {
  if (!rawColor || typeof rawColor !== 'string') return null;
  const clean = rawColor.trim().toLowerCase().replace(/[\s_-]+/g, ' ');
  if (!clean) return null;

  return COLOR_ALIAS_MAP[clean] || clean;
}

/**
 * Determines whether two color representations match.
 */
export function doColorsMatch(requestedColor: string | null | undefined, variantColor: string | null | undefined): boolean {
  if (!requestedColor || !variantColor) return false;
  const normRequested = normalizeColor(requestedColor);
  const normVariant = normalizeColor(variantColor);

  return normRequested === normVariant;
}

/**
 * Extracts and normalizes size and color attributes from a product variant.
 */
export function parseVariantAttributes(variant: ProductVariant): {
  size: string | null;
  color: string | null;
  attributes: Record<string, string>;
} {
  const attributes: Record<string, string> = { ...(variant.attributes as Record<string, string> || {}) };
  let size: string | null = null;
  let color: string | null = null;

  // 1. Direct attribute values
  if (attributes.size) {
    size = normalizeSize(attributes.size);
  } else if (attributes.talla) {
    size = normalizeSize(attributes.talla);
  }

  if (attributes.color) {
    color = normalizeColor(attributes.color);
  }

  // 2. Parse from variant name/title if not explicitly in attributes (e.g., "Negro / M" or "Azul / 32")
  const variantTitle = typeof variant.title === 'string' && variant.title.trim()
    ? variant.title
    : (variant.name || '');

  if (variantTitle && (!size || !color)) {
    const parts = variantTitle.split(/[\/\-|]+/).map((p) => p.trim());
    for (const part of parts) {
      if (!color) {
        const parsedColor = normalizeColor(part);
        if (parsedColor && parsedColor in COLOR_ALIAS_MAP) {
          color = parsedColor;
          continue;
        }
      }
      if (!size) {
        const parsedSize = normalizeSize(part);
        if (parsedSize) {
          size = parsedSize;
        }
      }
    }
  }

  return { size, color, attributes };
}

/**
 * Converts a raw ProductVariant into a typed CatalogVariant.
 */
export function toCatalogVariant(
  variant: ProductVariant,
  productId: string,
  defaultSkuPrefix: string,
): CatalogVariant {
  const { size, color, attributes } = parseVariantAttributes(variant);
  const stock = typeof variant.stock === 'number' && Number.isFinite(variant.stock) ? Math.max(0, Math.floor(variant.stock)) : 0;
  const title = typeof variant.title === 'string' && variant.title.trim() ? variant.title : (variant.name || 'Default Variant');

  // Stable variant SKU fallback
  const sku = typeof variant.sku === 'string' && variant.sku.trim()
    ? variant.sku.trim().toUpperCase()
    : `${defaultSkuPrefix}-${(size || color || 'DEF').toUpperCase().replace(/[^A-Z0-9]/g, '')}`;

  return {
    id: variant.id || sku,
    productId,
    sku,
    name: title,
    size,
    color,
    attributes,
    price: typeof variant.price === 'number' && Number.isFinite(variant.price) ? variant.price : null,
    stock,
    isAvailable: stock > 0,
    barcode: typeof variant.barcode === 'string' ? variant.barcode : null,
  };
}

/**
 * Matches variants for a product given optional requested size and/or color.
 */
export function matchProductVariants(
  variants: CatalogVariant[],
  requestedSize?: string | null,
  requestedColor?: string | null,
): {
  exactMatch: CatalogVariant | null;
  matchingVariants: CatalogVariant[];
  availableSizesForColor: string[];
  availableColorsForSize: string[];
  allAvailableSizes: string[];
  allAvailableColors: string[];
} {
  const normSize = normalizeSize(requestedSize);
  const normColor = normalizeColor(requestedColor);

  let matchingVariants: CatalogVariant[] = [...variants];

  if (normSize) {
    matchingVariants = matchingVariants.filter((v) => doSizesMatch(normSize, v.size));
  }

  if (normColor) {
    matchingVariants = matchingVariants.filter((v) => doColorsMatch(normColor, v.color));
  }

  // Exact match if exactly one variant matches both requested criteria
  let exactMatch: CatalogVariant | null = null;
  if (matchingVariants.length === 1 && (normSize || normColor)) {
    exactMatch = matchingVariants[0];
  } else if (normSize && normColor) {
    // Look for variant matching both exactly
    exactMatch = variants.find((v) => doSizesMatch(normSize, v.size) && doColorsMatch(normColor, v.color)) || null;
  }

  // Cross-options for OOS / alternative recommendations
  const allAvailableSizes = Array.from(
    new Set(variants.filter((v) => v.stock > 0 && v.size).map((v) => v.size as string)),
  );
  const allAvailableColors = Array.from(
    new Set(variants.filter((v) => v.stock > 0 && v.color).map((v) => v.color as string)),
  );

  const availableSizesForColor = normColor
    ? Array.from(
        new Set(
          variants
            .filter((v) => doColorsMatch(normColor, v.color) && v.stock > 0 && v.size)
            .map((v) => v.size as string),
        ),
      )
    : [];

  const availableColorsForSize = normSize
    ? Array.from(
        new Set(
          variants
            .filter((v) => doSizesMatch(normSize, v.size) && v.stock > 0 && v.color)
            .map((v) => v.color as string),
        ),
      )
    : [];

  return {
    exactMatch,
    matchingVariants,
    availableSizesForColor,
    availableColorsForSize,
    allAvailableSizes,
    allAvailableColors,
  };
}
