import { StoreHeader } from '../../components/storefront/StoreHeader';
import { WishlistButton } from '../../components/storefront/WishlistButton';
import { Link } from 'react-router-dom';
import React, { useEffect, useMemo, useState } from 'react';
import { useSearchProducts } from '../../hooks/useSearchProducts';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { useCart, CartDrawer } from '../../App';
import { SearchBar } from '../../components/storefront/SearchBar';
import { ProductFilters } from '../../components/storefront/ProductFilters';
import { Pagination } from '../../components/storefront/Pagination';
import { SEO } from '../../components/SEO';
import { StarRating } from '../../components/reviews/StarRating';
import { useProductRating } from '../../hooks/useReviews';
import { toast } from 'react-hot-toast';
import { organizationJsonLd, websiteJsonLd, productCanonicalPath } from '../../lib/seo';
import { ArrowRight, HeartHandshake, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';

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
      body: JSON.stringify({ event_type: type, session_id: sessionId, source: 'storefront', metadata })
    }).catch(() => undefined);
  } catch (_) {
    // Analytics must never break shopping.
  }
}

export function HomePage() {
  const { data: store, isLoading: isStoreLoading } = useStoreConfig();
  const [filters, setFilters] = useState({ search: '', minPrice: '', maxPrice: '', sortBy: 'created_at', order: 'desc', page: 1, pageSize: 12 });
  const { data: searchResult, isLoading: isProductsLoading } = useSearchProducts(store?.slug, filters);

  useEffect(() => {
    trackMarketingEvent('page_view', { page: 'home' });
  }, []);
  const { items, setIsCartOpen } = useCart();

  useEffect(() => {
    if (store?.config?.fontFamily) {
      const font = store.config.fontFamily;
      const linkId = 'dynamic-font';
      let link = document.getElementById(linkId) as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
      }
      if (font === 'Playfair Display') link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap';
      else if (font === 'Space Grotesk') link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap';
      else link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap';
    }
  }, [store?.config?.fontFamily]);

  if (isStoreLoading) return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">Cargando Selfcare Sinners...</div>;

  const currentStore = store || { name: DEFAULT_BRAND, config: {}, description: 'Skincare seleccionado con criterio, seguridad y experiencia premium.' };
  const currentProducts = searchResult?.data || [];
  const featuredProducts = currentProducts.slice(0, 3);
  const totalPages = searchResult && searchResult.total ? Math.ceil(searchResult.total / (searchResult.pageSize || 20)) : 1;
  const config = currentStore.config || {};
  const themeColor = config.themeColor || '#6B705C';
  const secondaryColor = config.secondaryColor || '#A5A58D';
  const backgroundColor = config.backgroundColor || '#FDFCFB';
  const textColor = config.textColor || '#333333';
  const layout = config.layout || 'grid';
  const borderRadius = config.borderRadius || 'xl';
  const fontFamily = config.fontFamily === 'Playfair Display' ? '"Playfair Display", serif' : config.fontFamily === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : '"Inter", sans-serif';
  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  const quickBenefits = [
    { icon: <ShieldCheck size={20} />, title: 'Compra segura', text: 'Pago protegido con Stripe y confirmación por correo.' },
    { icon: <PackageCheck size={20} />, title: 'Inventario real', text: 'Disponibilidad validada antes de finalizar el pago.' },
    { icon: <Truck size={20} />, title: 'Seguimiento', text: 'Rastrea tu pedido con ID y correo.' },
    { icon: <HeartHandshake size={20} />, title: 'Atención clara', text: 'FAQ, contacto y políticas visibles antes de comprar.' },
  ];

  return (
    <>
      <SEO title={`${currentStore.name || DEFAULT_BRAND} | Skincare consciente`} description={currentStore.description || 'Skincare seleccionado para rutinas simples, seguras y efectivas.'} canonicalPath="/" jsonLd={[organizationJsonLd(), websiteJsonLd()]} />
      <div className="min-h-screen flex flex-col" style={{
        backgroundColor,
        color: textColor,
        fontFamily,
        '--theme-color': themeColor,
        '--secondary-color': secondaryColor,
        '--border-radius-base': borderRadius === 'none' ? '0px' : borderRadius === 'sm' ? '4px' : borderRadius === 'md' ? '8px' : borderRadius === 'lg' ? '16px' : borderRadius === 'xl' ? '24px' : '9999px',
        '--border-radius-sm': borderRadius === 'none' ? '0px' : borderRadius === 'sm' ? '2px' : borderRadius === 'md' ? '4px' : borderRadius === 'lg' ? '8px' : borderRadius === 'xl' ? '12px' : '9999px',
      } as React.CSSProperties}>
        <StoreHeader />

        <section className="relative overflow-hidden border-b" style={{ borderColor: secondaryColor + '30' }}>
          <div className="absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at top left, ${secondaryColor}22, transparent 32%), radial-gradient(circle at bottom right, ${themeColor}1f, transparent 38%)` }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-[1.08fr_0.92fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/70 border text-xs font-bold uppercase tracking-[0.2em] mb-6" style={{ borderColor: secondaryColor + '55', color: themeColor }}>
                <Sparkles size={14} /> Selfcare Sinners
              </div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.95] mb-6">
                Skincare curado para una rutina que sí puedes sostener.
              </h1>
              <p className="text-base sm:text-xl opacity-75 leading-relaxed max-w-2xl mb-8">
                Productos seleccionados, compra segura, seguimiento claro y una experiencia pensada para decidir rápido sin perder confianza.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <a href="#catalogo" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-white font-bold shadow-sm" style={{ backgroundColor: config.buttonColor || themeColor }}>
                  Comprar ahora <ArrowRight size={18} />
                </a>
                <Link to="/track" className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white border font-bold" style={{ borderColor: secondaryColor + '55', color: themeColor }}>
                  Rastrear pedido
                </Link>
              </div>
            </div>
            <div className="bg-white/75 backdrop-blur rounded-[2rem] p-4 sm:p-6 border shadow-sm" style={{ borderColor: secondaryColor + '30' }}>
              <div className="aspect-[4/3] rounded-[1.5rem] overflow-hidden bg-gray-100 relative">
                {featuredProducts[0]?.images?.[0] ? (
                  <img src={featuredProducts[0].images[0]} alt={featuredProducts[0].name} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-center p-10 opacity-60">Selfcare Sinners collection</div>
                )}
                <div className="absolute left-4 right-4 bottom-4 bg-white/90 backdrop-blur rounded-2xl p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-widest font-bold opacity-60">Producto destacado</p>
                  <p className="font-bold text-lg">{featuredProducts[0]?.name || 'Rutinas limpias, simples y seguras'}</p>
                  {featuredProducts[0] && <p className="text-sm opacity-70">MXN ${Number(featuredProducts[0].price).toFixed(2)}</p>}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickBenefits.map((item) => (
            <div key={item.title} className="bg-white rounded-2xl p-5 border" style={{ borderColor: secondaryColor + '30' }}>
              <div className="mb-3" style={{ color: themeColor }}>{item.icon}</div>
              <h3 className="font-bold mb-1">{item.title}</h3>
              <p className="text-sm opacity-65 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </section>

        <main id="catalogo" className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
          <div className="mb-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-3 tracking-tight">Catálogo</h2>
              <p className="text-base opacity-70 max-w-2xl">Filtra por categoría, busca productos y agrega al carrito sin perder el contexto de tu rutina.</p>
            </div>
            <button onClick={() => { trackMarketingEvent('cart_open', { source: 'home_button' }); setIsCartOpen(true); }} className="inline-flex items-center justify-center rounded-2xl px-5 py-3 bg-white border font-bold" style={{ borderColor: secondaryColor + '40' }}>
              Carrito ({cartItemCount})
            </button>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
            <aside className="w-full md:w-72 flex-shrink-0 flex flex-col gap-4 bg-white p-4 rounded-3xl border sticky top-4" style={{ borderColor: secondaryColor + '30' }}>
              <SearchBar onSearch={(search) => setFilters(prev => ({ ...prev, search, page: 1 }))} />
              <ProductFilters filters={filters} setFilters={(f: any) => {
                if (typeof f === 'function') setFilters((prev) => ({ ...f(prev), page: 1 }));
                else setFilters({ ...f, page: 1 });
              }} categories={config.categories} />
            </aside>

            <div className="flex-1 w-full">
              {isProductsLoading ? (
                <div className="py-20 text-center bg-white rounded-3xl border" style={{ borderColor: secondaryColor + '30' }}>Cargando productos...</div>
              ) : currentProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border" style={{ borderColor: secondaryColor + '30' }}>
                  <h3 className="font-bold text-xl mb-2">No encontramos productos con esos filtros.</h3>
                  <p className="opacity-60 mb-6">Prueba otra búsqueda o limpia los rangos de precio.</p>
                  <button onClick={() => setFilters({ search: '', minPrice: '', maxPrice: '', sortBy: 'created_at', order: 'desc', page: 1, pageSize: 12 })} className="px-5 py-3 rounded-xl text-white font-bold" style={{ backgroundColor: config.buttonColor || themeColor }}>
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <>
                  <div className={`grid gap-6 ${layout === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                    {currentProducts.map((p: any) => <StyledProductCard key={p.id} product={p} config={config} themeColor={themeColor} textColor={textColor} />)}
                  </div>
                  <Pagination page={filters.page} totalPages={totalPages} setPage={(page) => setFilters(prev => ({ ...prev, page }))} themeColor={themeColor} />
                </>
              )}
            </div>
          </div>
        </main>

        <section className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-12 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-3xl p-8 border" style={{ borderColor: secondaryColor + '30' }}>
            <h2 className="text-2xl font-black mb-3">Preguntas rápidas antes de comprar</h2>
            <div className="grid sm:grid-cols-2 gap-5 text-sm opacity-75">
              <p><strong>¿Cómo rastreo mi pedido?</strong><br />Desde la página de rastreo con tu correo y el ID de orden.</p>
              <p><strong>¿Cuándo se descuenta inventario?</strong><br />Después de confirmar el pago exitoso en Stripe.</p>
              <p><strong>¿Puedo contactar a la tienda?</strong><br />Sí, desde Contacto. El mensaje llega al correo admin configurado.</p>
              <p><strong>¿Dónde veo políticas?</strong><br />Footer con privacidad, términos y devoluciones visibles.</p>
            </div>
          </div>
          <div className="bg-white rounded-3xl p-8 border flex flex-col justify-between" style={{ borderColor: secondaryColor + '30' }}>
            <div>
              <h2 className="text-2xl font-black mb-3">¿Necesitas ayuda?</h2>
              <p className="text-sm opacity-70 mb-6">Consulta FAQ, contacto, devoluciones y términos antes de finalizar tu compra.</p>
            </div>
            <Link to="/faq" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white font-bold" style={{ backgroundColor: config.buttonColor || themeColor }}>
              Ver ayuda <ArrowRight size={16} />
            </Link>
          </div>
        </section>

        <footer className="mt-auto py-10 border-t text-sm" style={{ borderColor: secondaryColor + '30', color: secondaryColor }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <div>{config.footerText || `© ${new Date().getFullYear()} ${currentStore.name || DEFAULT_BRAND}`}</div>
            <div className="flex flex-wrap justify-center gap-6">
              <Link to="/faq" className="hover:underline">FAQ</Link>
              <Link to="/contact" className="hover:underline">Contacto</Link>
              <Link to="/returns" className="hover:underline">Devoluciones</Link>
              <Link to="/privacy" className="hover:underline">Privacidad</Link>
              <Link to="/terms" className="hover:underline">Términos</Link>
            </div>
          </div>
        </footer>

        <CartDrawer storeId={currentStore?.id} themeColor={themeColor} buttonColor={config.buttonColor || themeColor} />
      </div>
    </>
  );
}

export const StyledProductCard: React.FC<{ product: any, config: any, themeColor: string, textColor: string }> = ({ product, config, themeColor, textColor }) => {
  const { addItem } = useCart();
  const isList = config.layout === 'list';
  const hasVariants = product.variants && product.variants.length > 0;
  const inStock = hasVariants ? product.variants.some((v: any) => Number(v.stock) > 0) : Number(product.stock) > 0;
  const { data: ratingData } = useProductRating(product.id);

  return (
    <div className={`group overflow-hidden flex bg-white transition-transform hover:-translate-y-1 relative border ${isList ? 'flex-col sm:flex-row' : 'flex-col'}`} style={{ borderRadius: 'var(--border-radius-base)', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', borderColor: (config.secondaryColor || '#ccc') + '20' }}>
      {!inStock && <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full z-10">Agotado</div>}
      <Link to={productCanonicalPath(product)} className={`bg-gray-50 overflow-hidden relative block ${isList ? 'w-full sm:w-1/3 aspect-square sm:aspect-auto' : 'aspect-square'}`}>
        {product.images?.[0] ? <img src={product.images[0]} alt={product.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-300">Sin imagen</div>}
      </Link>
      <div className={`p-5 flex flex-col ${isList ? 'w-full sm:w-2/3 justify-center' : 'flex-1'}`}>
        <div className="flex justify-between items-start gap-4">
          <Link to={productCanonicalPath(product)} className="flex-1"><h3 className="font-bold text-lg mb-1 line-clamp-1 hover:underline" style={{ color: textColor }}>{product.name}</h3></Link>
          <WishlistButton productId={product.id} className="flex-shrink-0 -mt-1 -mr-1" />
        </div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {product.brand && <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{product.brand}</span>}
          {product.category && <span className="text-[10px] text-gray-400">{product.category}</span>}
          {hasVariants && <span className="text-[10px] text-gray-400">{product.variants.length} opciones</span>}
        </div>
        {ratingData && ratingData.count > 0 && <div className="mb-3 flex items-center gap-2"><StarRating rating={ratingData.average} color={themeColor} size={14} /><span className="text-xs opacity-60">{ratingData.count}</span></div>}
        <p className="opacity-70 text-sm line-clamp-2 mb-4 flex-1" style={{ color: config.secondaryColor || '#666' }}>{product.description}</p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t" style={{ borderColor: (config.secondaryColor || '#ccc') + '30' }}>
          <p className="font-semibold text-lg" style={{ color: themeColor }}>MXN ${Number(product.price).toFixed(2)}</p>
          {hasVariants ? (
            <Link to={productCanonicalPath(product)} className="px-4 py-2 text-white text-sm font-medium transition-opacity hover:opacity-90 active:scale-95 text-center" style={{ backgroundColor: config.buttonColor || themeColor, borderRadius: 'var(--border-radius-sm)' }}>Ver opciones</Link>
          ) : (
            <button disabled={!inStock} onClick={() => { addItem({ id: product.id, productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.images?.[0] }); trackMarketingEvent('add_to_cart', { product_id: product.id, product_name: product.name, price: product.price }); toast.success('Agregado al carrito'); }} className="px-4 py-2 text-white text-sm font-medium transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: config.buttonColor || themeColor, borderRadius: 'var(--border-radius-sm)' }}>{inStock ? 'Agregar' : 'Agotado'}</button>
          )}
        </div>
      </div>
    </div>
  );
};
