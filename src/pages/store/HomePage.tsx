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
import { trackMarketingEvent, trackPageView } from '../../lib/analytics';

const DEFAULT_BRAND = 'Selfcare Sinners';

export function HomePage() {
  const { data: store, isLoading: isStoreLoading } = useStoreConfig();
  const [filters, setFilters] = useState({ search: '', minPrice: '', maxPrice: '', sortBy: 'created_at', order: 'desc', page: 1, pageSize: 12 });
  const { data: searchResult, isLoading: isProductsLoading } = useSearchProducts(store?.slug, filters);
  const { items, setIsCartOpen } = useCart();

  useEffect(() => {
    trackPageView('home', { redesign: 'soft_premium_skincare' }, { source: 'soft_premium_storefront' });
  }, []);

  if (isStoreLoading) return <div className="ss-editorial-shell flex items-center justify-center">Cargando Selfcare Sinners...</div>;

  const currentStore = store || { name: DEFAULT_BRAND, config: {}, description: 'Skincare consciente para resultados reales, rutinas claras y una experiencia premium.' };
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
            <div className="ss-trust-editorial">
              <div><ShieldCheck size={20} /><strong>Pago seguro</strong><p>Stripe, confirmación y protección del checkout.</p></div>
              <div><PackageCheck size={20} /><strong>Stock real</strong><p>Inventario validado antes de cerrar la compra.</p></div>
              <div><Truck size={20} /><strong>Tracking</strong><p>Rastreo con correo e ID de orden.</p></div>
              <div><Sparkles size={20} /><strong>Ingredientes limpios</strong><p>Rutinas claras con fórmulas seguras.</p></div>
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

        <section className="ss-home-curated-row" aria-label="Beneficios principales">
          <article>
            <span>01</span>
            <strong>Rutina clara</strong>
            <p>Compra por objetivo: luminosidad, hidratación, balance o barrera.</p>
          </article>
          <article>
            <span>02</span>
            <strong>Producto protagonista</strong>
            <p>Cards limpias, imágenes amplias y decisiones de compra sin ruido.</p>
          </article>
          <article>
            <span>03</span>
            <strong>Confianza antes del pago</strong>
            <p>Envío, cambios, seguridad y soporte visibles durante todo el journey.</p>
          </article>
        </section>

        <section className="ss-home-editorial-grid" aria-label="Experiencia principal">
          <div className="ss-home-feature-card large">
            <p className="ss-topline">The skin edit</p>
            <h2 className="ss-display">Skincare que se siente cuidado, no saturado.</h2>
            <p>Una página principal con intención: primero propuesta de valor, después confianza, rutinas, productos y cierre de compra.</p>
            <a href="#shop" className="ss-btn">Comprar ahora <ArrowRight size={16} /></a>
          </div>
          <div className="ss-home-feature-card">
            <p className="ss-topline">Bestsellers</p>
            <h3>Lo más elegido</h3>
            <p>Acceso rápido a productos destacados sin obligar al usuario a filtrar desde cero.</p>
          </div>
          <div className="ss-home-feature-card muted">
            <p className="ss-topline">Mobile-first</p>
            <h3>Menos fricción</h3>
            <p>CTA claros, navegación inferior y carrito visible para comprar desde celular.</p>
          </div>
        </section>

        <main id="shop" className="ss-editorial-section ss-shop-section-organized">
          <div className="ss-section-head">
            <div>
              <p className="ss-topline">Tienda</p>
              <h2 className="ss-section-title ss-display">Todos los<br />productos</h2>
            </div>
            <p className="ss-section-note">Catálogo limpio, cálido y fácil de explorar. Busca por rutina, tipo de piel o producto y compra sin fricción.</p>
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
                  <p className="ss-topline">Sin resultados</p>
                  <h3 className="ss-section-title ss-display" style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}>No encontramos<br />productos</h3>
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

        <EditorialFooter storeName={currentStore.name || DEFAULT_BRAND} />
        <MobileEditorialNav cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />
        <CartDrawer storeId={(currentStore as any)?.id} themeColor="#0b0b0a" buttonColor="#0b0b0a" />
      </div>
    </>
  );
}
