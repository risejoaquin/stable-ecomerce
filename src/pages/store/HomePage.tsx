import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';
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

const DEFAULT_BRAND = 'Selfcare Sinners';

function trackMarketingEvent(type: string, metadata: Record<string, any> = {}) {
  try {
    const sessionKey = 'ss_marketing_session_id';
    let sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(sessionKey, sessionId);
    }
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: type, session_id: sessionId, source: 'skoot_editorial_storefront', metadata })
    }).catch(() => undefined);
  } catch (_) {}
}

export function HomePage() {
  const { data: store, isLoading: isStoreLoading } = useStoreConfig();
  const [filters, setFilters] = useState({ search: '', minPrice: '', maxPrice: '', sortBy: 'created_at', order: 'desc', page: 1, pageSize: 12 });
  const { data: searchResult, isLoading: isProductsLoading } = useSearchProducts(store?.slug, filters);
  const { items, setIsCartOpen } = useCart();

  useEffect(() => {
    trackMarketingEvent('page_view', { page: 'home', redesign: 'skoot_editorial' });
  }, []);

  if (isStoreLoading) return <div className="ss-editorial-shell flex items-center justify-center">Cargando Selfcare Sinners...</div>;

  const currentStore = store || { name: DEFAULT_BRAND, config: {}, description: 'Skincare seleccionado con criterio, seguridad y experiencia editorial.' };
  const config = currentStore.config || {};
  const currentProducts = searchResult?.data || [];
  const heroProduct = currentProducts[0];
  const totalPages = searchResult && searchResult.total ? Math.ceil(searchResult.total / (searchResult.pageSize || 20)) : 1;
  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  const resetFilters = () => setFilters({ search: '', minPrice: '', maxPrice: '', sortBy: 'created_at', order: 'desc', page: 1, pageSize: 12 });

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
              <p className="ss-topline">New beauty system</p>
              <h1 className="ss-hero-title ss-display">SKINCARE<br />WITH EDGE</h1>
              <p className="ss-hero-lede">
                Una tienda de skincare con dirección editorial: menos plantilla, más marca, producto protagonista y compra clara desde móvil.
              </p>
              <div className="ss-hero-actions">
                <a href="#shop" className="ss-btn" onClick={() => trackMarketingEvent('hero_shop_click')}>Shop now <ArrowRight size={16} /></a>
                <a href="#lookbook" className="ss-btn-outline">View edit <Eye size={16} /></a>
              </div>
            </div>
            <div className="ss-trust-editorial">
              <div><ShieldCheck size={20} /><strong>Pago seguro</strong><p>Stripe, confirmación y protección del checkout.</p></div>
              <div><PackageCheck size={20} /><strong>Stock real</strong><p>Inventario validado antes de cerrar la compra.</p></div>
              <div><Truck size={20} /><strong>Tracking</strong><p>Rastreo con correo e ID de orden.</p></div>
              <div><Sparkles size={20} /><strong>Beauty edit</strong><p>Selección compacta, visual y clara.</p></div>
            </div>
          </div>
          <div className="ss-hero-media">
            <div className="ss-hero-image-frame">
              {heroProduct?.images?.[0] ? <img src={heroProduct.images[0]} alt={heroProduct.name} /> : <div className="absolute inset-0 flex items-center justify-center ss-display text-6xl opacity-20">SELFCARE</div>}
              <div className="ss-hero-overlay">
                <div>
                  <p className="ss-card-kicker">Featured drop</p>
                  <strong>{heroProduct?.name || 'Editorial skincare drop'}</strong>
                </div>
                {heroProduct && <span>MXN ${Number(heroProduct.price).toFixed(2)}</span>}
              </div>
            </div>
            <div className="ss-hero-marquee"><span>SELFCARE SINNERS · BEAUTY EDITORIAL · ROUTINE READY · MOBILE FIRST · TRUSTED CHECKOUT · SELFCARE SINNERS · BEAUTY EDITORIAL · ROUTINE READY · MOBILE FIRST · TRUSTED CHECKOUT · </span></div>
          </div>
        </section>

        <main id="shop" className="ss-editorial-section">
          <div className="ss-section-head">
            <div>
              <p className="ss-topline">Shop</p>
              <h2 className="ss-section-title ss-display">PRODUCT<br />INDEX</h2>
            </div>
            <p className="ss-section-note">Catálogo directo, visual y sin ruido. Busca, filtra y compra con estructura editorial inspirada en tiendas de alto impacto.</p>
          </div>

          <div className="ss-shop-layout">
            <aside className="ss-filter-rail">
              <SearchBar onSearch={(search) => setFilters(prev => ({ ...prev, search, page: 1 }))} />
              <div style={{ height: '.8rem' }} />
              <ProductFilters filters={filters} setFilters={(f: any) => {
                if (typeof f === 'function') setFilters((prev) => ({ ...f(prev), page: 1 }));
                else setFilters({ ...f, page: 1 });
              }} categories={config.categories} />
            </aside>

            <div>
              {isProductsLoading ? (
                <div className="p-12 text-center">Cargando productos...</div>
              ) : currentProducts.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="ss-topline">No results</p>
                  <h3 className="ss-section-title ss-display" style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}>EMPTY<br />EDIT</h3>
                  <p className="ss-section-note" style={{ margin: '1rem auto' }}>No encontramos productos con esos filtros. Limpia la búsqueda y vuelve al catálogo.</p>
                  <button className="ss-btn" onClick={resetFilters} type="button">Limpiar filtros</button>
                </div>
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
              <p className="ss-topline">Before checkout</p>
              <h2 className="ss-section-title ss-display">BUY WITH<br />CLARITY</h2>
            </div>
            <p className="ss-section-note">La estética cambia, pero la base comercial se mantiene: ayuda visible, políticas claras, tracking y confianza antes del pago.</p>
          </div>
          <div className="ss-trust-editorial">
            <div><strong>FAQ</strong><p>Respuestas visibles antes de comprar.</p><Link to="/faq" className="ss-mini-btn">Ver FAQ</Link></div>
            <div><strong>Contacto</strong><p>Canal claro para dudas o soporte.</p><Link to="/contact" className="ss-mini-btn">Contactar</Link></div>
            <div><strong>Devoluciones</strong><p>Políticas accesibles para reducir fricción.</p><Link to="/returns" className="ss-mini-btn">Política</Link></div>
            <div><strong>Tracking</strong><p>Consulta tu pedido con correo e ID.</p><Link to="/track" className="ss-mini-btn">Rastrear</Link></div>
          </div>
        </section>

        <EditorialFooter storeName={currentStore.name || DEFAULT_BRAND} />
        <MobileEditorialNav cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />
        <CartDrawer storeId={(currentStore as any)?.id} themeColor="#0b0b0a" buttonColor="#0b0b0a" />
      </div>
    </>
  );
}
