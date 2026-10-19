// @vitest-environment node
import { describe, expect, it, beforeEach } from 'vitest';
import {
  CatalogResolver,
  InMemoryCatalogRepository,
  BLACK_RELIC_MOCK_CATALOG,
  buildAuthoritativePrice,
  computeAuthoritativeStock,
  normalizeSize,
  normalizeColor,
  doSizesMatch,
  doColorsMatch,
  buildMetaCatalogItem,
  parseMetaContentId,
  createConversationState,
  formatCurrencyMxn,
  ISO_CURRENCY_MXN,
  type ExtractedEntities,
} from '../../../src/services/meta-commerce';
import type { Product } from '../../../src/types';

describe('Meta Commerce Catalog & Stock Resolver (AG-CATALOG-RESOLVER)', () => {
  let repository: InMemoryCatalogRepository;
  let resolver: CatalogResolver;

  beforeEach(() => {
    repository = new InMemoryCatalogRepository();
    resolver = new CatalogResolver(repository);
  });

  // --------------------------------------------------------------------------
  // 1. Product & Variant Resolution
  // --------------------------------------------------------------------------
  describe('1. Product & Variant Resolution', () => {
    it('resolves product by exact product ID', async () => {
      const result = await resolver.resolveProduct({ productId: 'prod_relic_hoodie_001' });
      expect(result.status).toBe('VARIANT_SELECTION_REQUIRED');
      expect(result.product).not.toBeNull();
      expect(result.product?.id).toBe('prod_relic_hoodie_001');
      expect(result.product?.name).toContain('Sudadera Relic Heavyweight');
    });

    it('resolves product by slug', async () => {
      const result = await resolver.resolveProduct({ slug: 'sudadera-relic-heavyweight' });
      expect(result.product?.id).toBe('prod_relic_hoodie_001');
    });

    it('resolves product by SKU', async () => {
      const result = await resolver.resolveProduct({ sku: 'SKU-SUDADERARELICHEAVYWEIGHT' });
      expect(result.product?.id).toBe('prod_relic_hoodie_001');
    });

    it('resolves product by Spanish keyword / product mention', async () => {
      const result = await resolver.resolveProduct({ mention: 'hoodie' });
      expect(result.product?.id).toBe('prod_relic_hoodie_001');

      const teeResult = await resolver.resolveProduct({ mention: 'playera' });
      expect(teeResult.product?.id).toBe('prod_relic_tee_002');

      const denimResult = await resolver.resolveProduct({ mention: 'denim' });
      expect(denimResult.product?.id).toBe('prod_relic_pant_003');
    });

    it('resolves exact variant when size and color are specified', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'S',
      });
      expect(result.status).toBe('RESOLVED');
      expect(result.variant).not.toBeNull();
      expect(result.variant?.id).toBe('var_hoodie_negro_s');
      expect(result.variant?.size).toBe('S');
      expect(result.variant?.color).toBe('negro');
      expect(result.stock?.availableStock).toBe(8);
      expect(result.stock?.isAvailable).toBe(true);
    });

    it('resolves variants using Mexican Spanish size names (chica, mediana, grande)', async () => {
      const resultCh = await resolver.resolveProduct({
        mention: 'playera',
        color: 'negro',
        size: 'chica',
      });
      expect(resultCh.status).toBe('RESOLVED');
      expect(resultCh.variant?.id).toBe('var_tee_negro_ch');
      expect(resultCh.variant?.size).toBe('S'); // Normalized canonical size

      const resultMed = await resolver.resolveProduct({
        mention: 'playera',
        color: 'negro',
        size: 'mediana',
      });
      expect(resultMed.status).toBe('RESOLVED');
      expect(resultMed.variant?.id).toBe('var_tee_negro_m');
      expect(resultMed.variant?.size).toBe('M');

      const resultGde = await resolver.resolveProduct({
        mention: 'playera',
        color: 'negro',
        size: 'grande',
      });
      expect(resultGde.status).toBe('RESOLVED');
      expect(resultGde.variant?.id).toBe('var_tee_negro_g');
      expect(resultGde.variant?.size).toBe('L'); // Normalized canonical size
    });

    it('resolves numeric waist sizes on denim pants (28, 30, 32, 34)', async () => {
      const result = await resolver.resolveProduct({
        mention: 'pantalon',
        color: 'azul',
        size: '32',
      });
      expect(result.status).toBe('RESOLVED');
      expect(result.variant?.id).toBe('var_pant_azul_32');
      expect(result.variant?.size).toBe('32');
      expect(result.stock?.availableStock).toBe(5);
    });

    it('requires variant selection when product is found but no size/color is provided', async () => {
      const result = await resolver.resolveProduct({ mention: 'hoodie' });
      expect(result.status).toBe('VARIANT_SELECTION_REQUIRED');
      expect(result.variant).toBeNull();
      expect(result.requiresClarification).toBe(true);
      expect(result.availableSizes.length).toBeGreaterThan(0);
      expect(result.availableColors.length).toBeGreaterThan(0);
      expect(result.clarificationPrompt).toContain('¿Qué talla y color te gustaría?');
    });

    it('returns VARIANT_NOT_FOUND when requested size does not exist for the product', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: '3XL', // Hoodie only goes up to XL
      });
      expect(result.status).toBe('VARIANT_NOT_FOUND');
      expect(result.variant).toBeNull();
      expect(result.requiresClarification).toBe(true);
      expect(result.conversationalSummary).toContain('No contamos con Sudadera Relic Heavyweight 500 GSM en talla 3XL');
      expect(result.clarificationPrompt).toContain('Las opciones disponibles en stock son:');
    });

    it('returns VARIANT_NOT_FOUND when requested color does not exist for the product', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'morado', // Not in catalog
        size: 'M',
      });
      expect(result.status).toBe('VARIANT_NOT_FOUND');
      expect(result.conversationalSummary).toContain('color morado');
    });
  });

  // --------------------------------------------------------------------------
  // 2. Authoritative Price, Currency & Stock Rules
  // --------------------------------------------------------------------------
  describe('2. Authoritative Price, Currency & Stock Rules', () => {
    it('returns authoritative base price and ISO currency MXN', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'S',
      });
      expect(result.price).not.toBeNull();
      expect(result.price?.amount).toBe(1499);
      expect(result.price?.currency).toBe(ISO_CURRENCY_MXN);
      expect(result.price?.formatted).toBe('$1,499.00 MXN');
    });

    it('returns variant price override when specified on variant', async () => {
      // Cadena: 50cm is 2499, 60cm is 2799
      const result50 = await resolver.resolveProduct({
        mention: 'cadena',
        size: '50cm',
      });
      expect(result50.price?.amount).toBe(2499);

      const result60 = await resolver.resolveProduct({
        mention: 'cadena',
        size: '60cm',
      });
      expect(result60.price?.amount).toBe(2799);
      expect(result60.price?.formatted).toBe('$2,799.00 MXN');
    });

    it('calculates compare_at_price and discount percentage accurately', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'S',
      });
      // 1499 vs compare_at 1799 -> (1799-1499)/1799 = ~17%
      expect(result.price?.compareAtPrice).toBe(1799);
      expect(result.price?.hasDiscount).toBe(true);
      expect(result.price?.discountPercentage).toBe(17);
    });

    it('reports exact authoritative stock and flags LOW_STOCK when <= 3', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'XL', // stock is 2
      });
      expect(result.stock?.availableStock).toBe(2);
      expect(result.stock?.status).toBe('LOW_STOCK');
      expect(result.stock?.isAvailable).toBe(true);
      expect(result.conversationalSummary).toContain('¡Solo quedan 2 piezas disponibles!');
    });

    it('reports IN_STOCK when available stock exceeds low stock threshold', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'S', // stock is 8
      });
      expect(result.stock?.availableStock).toBe(8);
      expect(result.stock?.status).toBe('IN_STOCK');
      expect(result.stock?.isAvailable).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Zero Invented Inventory Invariant
  // --------------------------------------------------------------------------
  describe('3. Zero Invented Inventory Invariant', () => {
    it('strictly returns PRODUCT_NOT_FOUND when querying a non-existent product ID', async () => {
      const result = await resolver.resolveProduct({ productId: 'prod_hallucinated_999' });
      expect(result.status).toBe('PRODUCT_NOT_FOUND');
      expect(result.product).toBeNull();
      expect(result.variant).toBeNull();
      expect(result.price).toBeNull();
      expect(result.stock).toBeNull();
    });

    it('strictly returns PRODUCT_NOT_FOUND when querying an unknown product mention', async () => {
      const result = await resolver.resolveProduct({ mention: 'zapatos de charol voladores' });
      expect(result.status).toBe('PRODUCT_NOT_FOUND');
      expect(result.product).toBeNull();
      expect(result.stock).toBeNull();
    });

    it('enforces allowBackorder=false across all computed stock checks', () => {
      const stock1 = computeAuthoritativeStock(0, 1);
      expect(stock1.allowBackorder).toBe(false);

      const stock2 = computeAuthoritativeStock(5, 2);
      expect(stock2.allowBackorder).toBe(false);
    });

    it('ignores archived or inactive products during customer resolution', async () => {
      // prod_relic_archived_007 is archived in mock catalog
      const result = await resolver.resolveProduct({ productId: 'prod_relic_archived_007' });
      expect(result.status).toBe('PRODUCT_NOT_FOUND');
      expect(result.product).toBeNull();
    });

    it('stock strictly equals verified repository count even after simulated stock adjustment', async () => {
      repository.setStock('prod_relic_hoodie_001', 'var_hoodie_negro_s', 3);
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'S',
      });
      expect(result.stock?.availableStock).toBe(3);
      expect(result.stock?.status).toBe('LOW_STOCK');

      repository.setStock('prod_relic_hoodie_001', 'var_hoodie_negro_s', 0);
      const oosResult = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'S',
      });
      expect(oosResult.stock?.availableStock).toBe(0);
      expect(oosResult.status).toBe('OUT_OF_STOCK');
    });
  });

  // --------------------------------------------------------------------------
  // 4. Out of Stock (OOS) & Insufficient Quantity Handling
  // --------------------------------------------------------------------------
  describe('4. Out of Stock (OOS) & Insufficient Quantity Handling', () => {
    it('detects when requested variant is specifically out of stock', async () => {
      // Sudadera Negro M is specifically 0 stock in mock data
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'M',
      });
      expect(result.status).toBe('OUT_OF_STOCK');
      expect(result.stock?.availableStock).toBe(0);
      expect(result.stock?.isAvailable).toBe(false);
      expect(result.stock?.status).toBe('OUT_OF_STOCK');
      expect(result.conversationalSummary).toContain('La talla M en color negro de Sudadera Relic Heavyweight 500 GSM está temporalmente agotada');
      expect(result.requiresClarification).toBe(true);
    });

    it('detects insufficient stock when requested quantity exceeds available stock', async () => {
      // Cadena 60cm has only 1 piece
      const result = await resolver.resolveProduct({
        mention: 'cadena',
        size: '60cm',
        quantity: 3, // Wants 3, only 1 available
      });
      expect(result.status).toBe('OUT_OF_STOCK');
      expect(result.stock?.status).toBe('INSUFFICIENT_STOCK');
      expect(result.stock?.availableStock).toBe(1);
      expect(result.stock?.requestedQuantity).toBe(3);
      expect(result.stock?.isAvailable).toBe(false);
      expect(result.conversationalSummary).toContain('Solo tenemos 1 pieza(s) disponible(s)');
    });

    it('detects when an entire product is completely out of stock across all variants', async () => {
      // prod_relic_tote_006 has 0 stock across all variants
      const result = await resolver.resolveProduct({ productId: 'prod_relic_tote_006' });
      expect(result.status).toBe('OUT_OF_STOCK');
      expect(result.stock?.availableStock).toBe(0);
      expect(result.availableVariants.length).toBe(0);
      expect(result.conversationalSummary).toContain('están agotadas en este momento');
    });
  });

  // --------------------------------------------------------------------------
  // 5. Alternatives ONLY From Real Catalog Data
  // --------------------------------------------------------------------------
  describe('5. Alternatives ONLY From Real Catalog Data', () => {
    it('proposes real in-stock sizes of same product when requested size is OOS', async () => {
      // Sudadera Negro M is OOS
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'M',
      });

      expect(result.alternatives.length).toBeGreaterThan(0);

      // Verify STRICT INVARIANT: every alternative must exist and have availableStock > 0
      for (const alt of result.alternatives) {
        expect(alt.availableStock).toBeGreaterThan(0);
        const verifiedProduct = await repository.findById(alt.productId);
        expect(verifiedProduct).not.toBeNull();
        expect(verifiedProduct?.status).toBe('active');
      }

      // First alternatives should be same product in available sizes (S, L, XL in negro)
      const sameColorAlt = result.alternatives.find((a) => a.reason === 'same_product_other_size');
      expect(sameColorAlt).toBeDefined();
      expect(sameColorAlt?.color).toBe('negro');
      expect(['S', 'L', 'XL']).toContain(sameColorAlt?.size);
    });

    it('proposes other in-stock colors in same requested size when color is OOS', async () => {
      // Sudadera Blanco L is OOS (stock: 0) while Negro L has stock 5
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'blanco',
        size: 'L',
      });

      expect(result.status).toBe('OUT_OF_STOCK');
      const otherColorAlt = result.alternatives.find((a) => a.reason === 'same_product_other_color');
      expect(otherColorAlt).toBeDefined();
      expect(otherColorAlt?.color).toBe('negro');
      expect(otherColorAlt?.size).toBe('L');
      expect(otherColorAlt?.availableStock).toBe(5);
    });

    it('proposes category alternatives when entire product is OOS', async () => {
      const result = await resolver.resolveProduct({ productId: 'prod_relic_tote_006' });
      expect(result.alternatives.length).toBeGreaterThan(0);
      for (const alt of result.alternatives) {
        expect(alt.availableStock).toBeGreaterThan(0);
      }
    });

    it('never includes an out-of-stock variant in alternatives', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'M', // Negro M is 0
      });

      // Negro M must NOT be in alternatives
      const hasOosNegroM = result.alternatives.some((a) => a.color === 'negro' && a.size === 'M');
      expect(hasOosNegroM).toBe(false);

      // Blanco L is also 0 stock in mock data, must NOT be in alternatives
      const hasOosBlancoL = result.alternatives.some((a) => a.color === 'blanco' && a.size === 'L');
      expect(hasOosBlancoL).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 6. Stable IDs Compatible with Catalog & Meta CAPI Mapping
  // --------------------------------------------------------------------------
  describe('6. Stable IDs Compatible with Catalog & Meta CAPI Mapping', () => {
    it('generates compliant MetaCatalogItem for product with variants', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'S',
      });

      expect(result.metaMapping).not.toBeNull();
      const meta = result.metaMapping!;
      expect(meta.id).toBe('SKU-SUDADERARELICHEAVYWEIGHT-NEGRO-S');
      expect(meta.item_group_id).toBe('prod_relic_hoodie_001');
      expect(meta.availability).toBe('in stock');
      expect(meta.price).toBe('1499.00');
      expect(meta.currency).toBe('MXN');
      expect(meta.condition).toBe('new');
      expect(meta.brand).toBe('BLACK RELIC');
      expect(meta.link).toContain('/product/sudadera-relic-heavyweight');
      expect(meta.size).toBe('S');
      expect(meta.color).toBe('negro');
    });

    it('generates compliant MetaCatalogItem for OOS variant', async () => {
      const result = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'M',
      });

      expect(result.metaMapping?.availability).toBe('out of stock');
    });

    it('bidirectionally resolves product and variant from inbound Meta Content ID', async () => {
      const contentId = 'SKU-SUDADERARELICHEAVYWEIGHT-NEGRO-S';
      const result = await resolver.resolveProduct({ metaContentId: contentId });

      expect(result.status).toBe('RESOLVED');
      expect(result.product?.id).toBe('prod_relic_hoodie_001');
      expect(result.variant?.id).toBe('var_hoodie_negro_s');
      expect(result.variant?.sku).toBe(contentId);
      expect(result.stock?.availableStock).toBe(8);
    });

    it('parses inbound Meta Content IDs and distinguishes variant SKUs', () => {
      const varInfo = parseMetaContentId('SKU-SUDADERARELICHEAVYWEIGHT-NEGRO-S');
      expect(varInfo.normalizedContentId).toBe('SKU-SUDADERARELICHEAVYWEIGHT-NEGRO-S');
      expect(varInfo.isVariantSku).toBe(true);

      const parentInfo = parseMetaContentId('SKU-SUDADERARELICHEAVYWEIGHT');
      expect(parentInfo.isVariantSku).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Conversation Engine Connection
  // --------------------------------------------------------------------------
  describe('7. Conversation Engine Connection', () => {
    it('resolves product and variant from ConversationState and ExtractedEntities', async () => {
      const state = createConversationState({
        conversation_id: 'conv_insta_dm_100',
        external_user_id: 'igsid_customer_789',
        initial_intent: 'product_info',
      });

      const entities: ExtractedEntities = {
        productMention: 'sudadera',
        color: 'negro',
        size: 'S',
        quantity: 2,
        paymentMethod: null,
        shippingCity: null,
      };

      const result = await resolver.resolveFromConversation(state, entities);
      expect(result.status).toBe('RESOLVED');
      expect(result.product?.id).toBe('prod_relic_hoodie_001');
      expect(result.variant?.id).toBe('var_hoodie_negro_s');
      expect(result.stock?.requestedQuantity).toBe(2);
      expect(result.stock?.isAvailable).toBe(true);
    });

    it('applies resolution to ConversationState deterministically', async () => {
      const state = createConversationState({
        conversation_id: 'conv_insta_dm_200',
        external_user_id: 'igsid_customer_789',
        initial_intent: 'add_to_cart',
      });

      const result = await resolver.resolveProduct({
        mention: 'playera',
        color: 'negro',
        size: 'M',
        quantity: 1,
      });

      const updatedState = resolver.applyResolutionToState(state, result);
      expect(updatedState.current_product_id).toBe('prod_relic_tee_002');
      expect(updatedState.current_variant_id).toBe('var_tee_negro_m');
      expect(updatedState.quantity).toBe(1);
      expect(updatedState.state_version).toBe(state.state_version + 2); // PRODUCT_SELECTED + VARIANT_SELECTED
    });

    it('generates clear Mexican Spanish conversational text for DMs', async () => {
      const resolved = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'S',
      });
      expect(resolved.conversationalSummary).toContain('Tenemos disponible Sudadera Relic Heavyweight 500 GSM (Negro / S) por $1,499.00 MXN.');

      const oos = await resolver.resolveProduct({
        mention: 'hoodie',
        color: 'negro',
        size: 'M',
      });
      expect(oos.conversationalSummary).toContain('está temporalmente agotada');
      expect(oos.clarificationPrompt).toContain('¿Te gustaría ordenar en otra talla o color disponible?');
    });
  });

  // --------------------------------------------------------------------------
  // 8. Size & Color Normalization Helpers
  // --------------------------------------------------------------------------
  describe('8. Size & Color Normalization Helpers', () => {
    it('normalizes Mexican Spanish size aliases', () => {
      expect(normalizeSize('ch')).toBe('S');
      expect(normalizeSize('chica')).toBe('S');
      expect(normalizeSize('mediana')).toBe('M');
      expect(normalizeSize('gde')).toBe('L');
      expect(normalizeSize('grande')).toBe('L');
      expect(normalizeSize('extra grande')).toBe('XL');
      expect(normalizeSize('2xl')).toBe('2XL');
      expect(normalizeSize('unitalla')).toBe('Unitalla');
    });

    it('evaluates size equivalence with doSizesMatch', () => {
      expect(doSizesMatch('CH', 'S')).toBe(true);
      expect(doSizesMatch('chica', 'S')).toBe(true);
      expect(doSizesMatch('G', 'L')).toBe(true);
      expect(doSizesMatch('grande', 'L')).toBe(true);
      expect(doSizesMatch('M', 'M')).toBe(true);
      expect(doSizesMatch('M', 'L')).toBe(false);
      expect(doSizesMatch('30', '30')).toBe(true);
      expect(doSizesMatch('30', '32')).toBe(false);
    });

    it('normalizes colors and English synonyms', () => {
      expect(normalizeColor('black')).toBe('negro');
      expect(normalizeColor('white')).toBe('blanco');
      expect(normalizeColor('grey')).toBe('gris');
      expect(normalizeColor('sand')).toBe('beige');
      expect(normalizeColor('negras')).toBe('negro');
      expect(normalizeColor('blancas')).toBe('blanco');
    });

    it('evaluates color equivalence with doColorsMatch', () => {
      expect(doColorsMatch('black', 'negro')).toBe(true);
      expect(doColorsMatch('negra', 'negro')).toBe(true);
      expect(doColorsMatch('white', 'blanco')).toBe(true);
      expect(doColorsMatch('rojo', 'azul')).toBe(false);
    });
  });
});
