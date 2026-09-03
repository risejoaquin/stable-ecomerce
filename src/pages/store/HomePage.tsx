import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Eye, SlidersHorizontal, X } from 'lucide-react';
import { useSearchProducts } from '../../hooks/useSearchProducts';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { useCart, CartDrawer } from '../../App';
import { SearchBar } from '../../components/storefront/SearchBar';
import { ProductFilters } from '../../components/storefront/ProductFilters';
import { Pagination } from '../../components/storefront/Pagination';
import { SEO } from '../../components/SEO';
import { organizationJsonLd, websiteJsonLd } from '../../lib/seo';
import { EditorialHeader } from '../../components/editorial/EditorialHeader';
import { EditorialProductCard } from '../../components/editorial/EditorialProductCard';
import { EditorialLookbookSection } from '../../components/editorial/EditorialLookbookSection';
import { EditorialFooter } from '../../components/editorial/EditorialFooter';
import { MobileEditorialNav } from '../../components/editorial/MobileEditorialNav';
import { trackMarketingEvent, trackPageView } from '../../lib/analytics';
import { UixSectionHeader } from '../../components/uix/UixSectionHeader';
import { StorefrontTrustStrip } from '../../components/storefront/uix/StorefrontTrustStrip';
import { RoutineCards } from '../../components/storefront/uix/RoutineCards';
import { ShopByConcern } from '../../components/storefront/uix/ShopByConcern';
import { StorefrontNewsletter } from '../../components/storefront/uix/StorefrontNewsletter';
import { UixStatePanel } from '../../components/uix/UixStatePanel';

const DEFAULT_BRAND = 'Selfcare Sinners';

export function HomePage() {
  const { data: store, isLoading: isStoreLoading } = useStoreConfig();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [filters, setFilters] = useState(() => ({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || 'all',
    minPrice: searchParams.get('min_price') || '',
    maxPrice: searchParams.get('max_price') || '',
    sortBy: searchParams.get('sort_by') || 'created_at',
    order: searchParams.get('order') || 'desc',
    page: Math.max(1, Number(searchParams.get('page') || '1') || 1),
    pageSize: 12,
  }));
  const { data: searchResult, isLoading: isProductsLoading } = useSearchProducts(store?.slug, filters);
  const { items, setIsCartOpen } = useCart();

  useEffect(() => {
    trackPageView('home', { redesign: 'soft_premium_skincare' }, { source: 'soft_premium_storefront' });
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.search) next.set('search', filters.search);
    if (filters.category && filters.category !== 'all') next.set('category', filters.category);
    if (filters.minPrice) next.set('min_price', filters.minPrice);
    if (filters.maxPrice) next.set('max_price', filters.maxPrice);
    if (filters.sortBy && filters.sortBy !== 'created_at') next.set('sort_by', filters.sortBy);
    if (filters.order && filters.order !== 'desc') next.set('order', filters.order);
    if (filters.page > 1) next.set('page', String(filters.page));
    setSearchParams(next, { replace: true });
  }, [filters, setSearchParams]);


  if (isStoreLoading) return <div className="ss-editorial-shell uix-storefront-loading"><UixStatePanel tone="loading" title="Preparando Selfcare Sinners" description="Estamos cargando el catálogo y la experiencia de tienda." /></div>;

  const currentStore = store || { name: DEFAULT_BRAND, config: {}, description: 'Skincare consciente para resultados reales, rutinas claras y una experiencia premium.' };
  const config = currentStore.config || {};
  const currentProducts = searchResult?.data || [];
  const heroProduct = currentProducts[0];
  const totalPages = searchResult && searchResult.total ? Math.ceil(searchResult.total / (searchResult.pageSize || 20)) : 1;
  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  const resetFilters = () => setFilters({ search: '', category: 'all', minPrice: '', maxPrice: '', sortBy: 'created_at', order: 'desc', page: 1, pageSize: 12 });
  const activeFilterCount = [filters.search, filters.category !== 'all' ? filters.category : '', filters.minPrice, filters.maxPrice].filter(Boolean).length;

  return (
    <>
      <SEO
        title={`${currentStore.name || DEFAULT_BRAND} | Editorial skincare store`}
        description={currentStore.description || 'Skincare curado con una experiencia editorial, segura y mobile-first.'}
        canonicalPath="/"
        jsonLd={[organizationJsonLd(), websiteJsonLd()]}
      />
      <div className="ss-editorial-shell">
        <EditorialHeader cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />

        <section className="ss-hero">
          <div className="ss-hero-copy">
            <div>
              <p className="ss-topline">Ritual consciente</p>
              <h1 className="ss-hero-title ss-display">Tu piel,<br />tu ritual,<br />tu momento.</h1>
              <p className="ss-hero-lede">
                Skincare consciente para resultados reales. Una experiencia cálida, clara y premium desde que descubres tu rutina hasta que completas tu compra.
              </p>
              <div className="ss-hero-actions">
                <a href="#shop" className="ss-btn" onClick={() => trackMarketingEvent('hero_shop_click', { page: 'home' }, { source: 'soft_premium_storefront' })}>Descubre tu rutina <ArrowRight size={16} /></a>
                <a href="#lookbook" className="ss-btn-outline">Ver rituales <Eye size={16} /></a>
              </div>
            </div>
            <div className="uix-hero-proof">
              <span>Envíos claros</span>
              <span>Pago seguro</span>
              <span>Rutinas simples</span>
            </div>
          </div>
          <div className="ss-hero-media">
            <div className="ss-hero-image-frame">
              {heroProduct?.images?.[0] ? <img src={heroProduct.images[0]} alt={heroProduct.name} /> : <div className="absolute inset-0 flex items-center justify-center ss-display text-6xl opacity-20">SELFCARE</div>}
              <div className="ss-hero-overlay">
                <div>
                  <p className="ss-card-kicker">Selección destacada</p>
                  <strong>{heroProduct?.name || 'Selección editorial'}</strong>
                </div>
                {heroProduct && <span>MXN ${Number(heroProduct.price).toFixed(2)}</span>}
              </div>
            </div>
            <div className="ss-hero-marquee"><span>SELFCARE SINNERS · RUTINAS CLARAS · COMPRA SEGURA · SKINCARE CONSCIENTE · SELFCARE SINNERS · RUTINAS CLARAS · COMPRA SEGURA · SKINCARE CONSCIENTE · </span></div>
          </div>
        </section>

        <StorefrontTrustStrip />

        <section className="uix-home-block" aria-label="Rutinas recomendadas">
          <UixSectionHeader
            eyebrow="Compra por ritual"
            title={<>Rutinas listas para decidir más rápido.</>}
            note="La home ya no empieza como catálogo genérico: guía al cliente por objetivo, contexto y beneficio antes de mostrar todo el inventario."
          />
          <RoutineCards />
        </section>

        <section className="uix-home-block uix-home-block--split" aria-label="Comprar por necesidad">
          <div className="uix-editorial-story">
            <p className="uix-eyebrow">Necesidades de piel</p>
            <h2>Encuentra producto por lo que tu piel necesita.</h2>
            <p>Un storefront premium no obliga a pensar en categorías técnicas. Primero ayuda al usuario a reconocerse: hidratación, manchas, acné, barrera o protección solar.</p>
          </div>
          <ShopByConcern />
        </section>

        <main id="shop" className="ss-editorial-section ss-shop-section-organized">
          <div className="ss-section-head">
            <div>
              <p className="ss-topline">Tienda</p>
              <h2 className="ss-section-title ss-display">Todos los<br />productos</h2>
            </div>
            <p className="ss-section-note">Catálogo limpio, cálido y fácil de explorar. Busca por rutina, tipo de piel o producto y compra sin fricción.</p>
          </div>

          <div className="uix-mobile-catalog-tools">
            <SearchBar initialValue={filters.search} onSearch={(search) => setFilters(prev => ({ ...prev, search, page: 1 }))} />
            <button type="button" className="uix-mobile-filter-trigger" aria-expanded={isMobileFiltersOpen} aria-controls="storefront-filters" onClick={() => setIsMobileFiltersOpen((open) => !open)}>
              {isMobileFiltersOpen ? <X size={17} /> : <SlidersHorizontal size={17} />} Filtros {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
            </button>
          </div>

          <div className="ss-shop-layout">
            <aside id="storefront-filters" className={`ss-filter-rail ${isMobileFiltersOpen ? 'is-mobile-open' : ''}`}>
              <div className="uix-desktop-filter-search"><SearchBar initialValue={filters.search} onSearch={(search) => setFilters(prev => ({ ...prev, search, page: 1 }))} /></div>
              <ProductFilters filters={filters} setFilters={(f: any) => {
                if (typeof f === 'function') setFilters((prev) => ({ ...f(prev), page: 1 }));
                else setFilters({ ...f, page: 1 });
              }} categories={config.categories} onReset={resetFilters} />
            </aside>

            <div className="uix-catalog-results">
              {isProductsLoading ? (
                <UixStatePanel tone="loading" title="Cargando productos" description="Estamos actualizando los resultados del catálogo." compact />
              ) : currentProducts.length === 0 ? (
                <UixStatePanel tone="empty" title="No encontramos productos" description="Prueba con otra búsqueda o limpia los filtros para volver a ver el catálogo completo." actionText="Limpiar filtros" onAction={resetFilters} />
              ) : (
                <>
                  <div className="ss-collection-grid">
                    {currentProducts.map((product: any) => <EditorialProductCard key={product.id} product={product} />)}
                  </div>
                  <div style={{ padding: '1.5rem' }}>
                    <Pagination page={filters.page} totalPages={totalPages} setPage={(page) => setFilters(prev => ({ ...prev, page }))} themeColor="#0b0b0a" />
                  </div>
                </>
              )}
            </div>
          </div>
        </main>

        <EditorialLookbookSection />

        <section className="ss-editorial-section">
          <div className="ss-section-head">
            <div>
              <p className="ss-topline">Antes de pagar</p>
              <h2 className="ss-section-title ss-display">Compra con<br />claridad</h2>
            </div>
            <p className="ss-section-note">La experiencia visual se mantiene serena y confiable: ayuda visible, políticas claras, tracking y seguridad antes del pago.</p>
          </div>
          <div className="ss-trust-editorial">
            <div><strong>FAQ</strong><p>Respuestas visibles antes de comprar.</p><Link to="/faq" className="ss-mini-btn">Ver FAQ</Link></div>
            <div><strong>Contacto</strong><p>Canal claro para dudas o soporte.</p><Link to="/contact" className="ss-mini-btn">Contactar</Link></div>
            <div><strong>Devoluciones</strong><p>Políticas accesibles para reducir fricción.</p><Link to="/returns" className="ss-mini-btn">Política</Link></div>
            <div><strong>Tracking</strong><p>Consulta tu pedido con correo e ID.</p><Link to="/track" className="ss-mini-btn">Rastrear</Link></div>
          </div>
        </section>

        <StorefrontNewsletter />

        <EditorialFooter storeName={currentStore.name || DEFAULT_BRAND} />
        <MobileEditorialNav cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />
        <CartDrawer storeId={(currentStore as any)?.id} themeColor="#0b0b0a" buttonColor="#0b0b0a" />
      </div>
    </>
  );
}
