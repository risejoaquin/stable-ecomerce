import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useCart, CartDrawer } from '../../App';
import { useApiClient } from '../../api/useApiClient';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { useSearchProducts } from '../../hooks/useSearchProducts';
import { useProductRating } from '../../hooks/useReviews';
import { useAuthSafe as useAuth } from '../../hooks/useAuthSafe';
import { SEO } from '../../components/SEO';
import { ReviewList } from '../../components/reviews/ReviewList';
import { ReviewForm } from '../../components/reviews/ReviewForm';
import { StarRating } from '../../components/reviews/StarRating';
import { WishlistButton } from '../../components/storefront/WishlistButton';
import { productCanonicalPath, productJsonLd, stripHtml } from '../../lib/seo';
import { EditorialHeader } from '../../components/editorial/EditorialHeader';
import { EditorialFooter } from '../../components/editorial/EditorialFooter';
import { EditorialProductCard } from '../../components/editorial/EditorialProductCard';
import { MobileEditorialNav } from '../../components/editorial/MobileEditorialNav';

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
      body: JSON.stringify({ event_type: type, session_id: sessionId, source: 'skoot_editorial_product_detail', product_id: metadata.product_id, metadata })
    }).catch(() => undefined);
  } catch (_) {}
}

export function ProductDetailPage() {
  const { id } = useParams();
  const apiClient = useApiClient();
  const { setIsCartOpen, addItem, items } = useCart();
  const { data: store, isLoading: isStoreLoading } = useStoreConfig();
  const { data: ratingData } = useProductRating(id || '');
  const { isSignedIn } = useAuth();
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.get(`/products/${id}`),
    enabled: !!id
  });

  useEffect(() => {
    if (id) trackMarketingEvent('product_view', { product_id: id, redesign: 'skoot_editorial' });
  }, [id]);

  const { data: similarProductsResult } = useSearchProducts(
    store?.slug,
    { category: (product?.categories && product.categories.length > 0) ? product.categories[0] : (product?.category || ''), pageSize: 4 },
  );
  const similarProducts = similarProductsResult?.data?.filter((p: any) => p.id !== product?.id).slice(0, 4) || [];

  if (isStoreLoading || isProductLoading) return <div className="ss-editorial-shell flex items-center justify-center">Cargando producto...</div>;
  if (!product) return <div className="ss-editorial-shell flex items-center justify-center">Producto no encontrado</div>;

  const currentStore = store || { name: 'Selfcare Sinners', config: {}, description: '' };
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;
  const activeVariant = selectedVariant || variants.find((v: any) => Number(v.stock) > 0) || null;
  const availableStock = hasVariants ? Number(activeVariant?.stock || 0) : Number(product.stock || 0);
  const inStock = availableStock > 0;
  const price = Number(activeVariant?.price || product.price || 0);
  const sku = activeVariant?.sku || product.sku;
  const ingredients = product.ingredients || product.config?.ingredients || [];
  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  const handleAddToCart = () => {
    if (hasVariants && !activeVariant) {
      toast.error('Selecciona una opción disponible primero');
      return;
    }
    if (!inStock) {
      toast.error('Producto agotado');
      return;
    }
    const variantSuffix = hasVariants ? ` - ${activeVariant.name}` : '';
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: hasVariants ? `${product.id}-${activeVariant.name}` : product.id,
        productId: product.id,
        name: `${product.name}${variantSuffix}`,
        price,
        quantity: 1,
        image: product.images?.[0],
        variant: activeVariant?.name,
        sku
      });
    }
    trackMarketingEvent('add_to_cart', { product_id: product.id, product_name: product.name, price, quantity, variant: activeVariant?.name });
    toast.success('Agregado al carrito');
    setIsCartOpen(true);
  };

  return (
    <>
      <SEO
        title={product.seo_title || product.name}
        description={stripHtml(product.seo_description || product.description || product.long_description)}
        image={product.images?.[0]}
        canonicalPath={productCanonicalPath(product)}
        type="product"
        jsonLd={productJsonLd(product, currentStore.name)}
      />
      <div className="ss-editorial-shell">
        <EditorialHeader backButton cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />

        <main className="ss-product-detail-layout">
          <section className="ss-gallery-panel">
            <div className="ss-main-product-image">
              <WishlistButton productId={product.id} className="absolute top-4 right-4 z-10 ss-mini-btn" />
              {product.images?.[selectedImageIndex] ? <img src={product.images[selectedImageIndex]} alt={product.name} /> : <div className="absolute inset-0 flex items-center justify-center opacity-40">Sin imagen</div>}
            </div>
            {product.images?.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {product.images.map((img: string, idx: number) => (
                  <button key={idx} onClick={() => setSelectedImageIndex(idx)} className="ss-editorial-thumb border" style={{ aspectRatio: '1/1', borderColor: selectedImageIndex === idx ? '#0b0b0a' : 'rgba(11,11,10,.13)' }} type="button">
                    <img src={img} alt={`${product.name} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="ss-buy-panel">
            <Link to="/" className="ss-topline">Back to shop</Link>
            <h1 className="ss-product-title-big ss-display">{product.name}</h1>
            <div className="flex flex-wrap items-center gap-3">
              {product.brand && <span className="ss-badge" style={{ position: 'static' }}>{product.brand}</span>}
              {product.category && <span className="ss-card-kicker">{product.category}</span>}
              {ratingData && ratingData.count > 0 ? <StarRating rating={ratingData.average} color="#0b0b0a" size={18} /> : <span className="ss-card-kicker">New review slot</span>}
            </div>
            <p className="ss-product-price">MXN ${price.toFixed(2)}</p>
            {sku && <p className="ss-card-kicker">SKU {sku}</p>}
            <p className="ss-hero-lede" style={{ marginTop: '1.2rem' }}>{product.description || 'Producto seleccionado para una rutina de skincare visual, clara y sostenible.'}</p>

            {hasVariants && (
              <div style={{ marginTop: '2rem' }}>
                <p className="ss-card-kicker">Choose option</p>
                <div className="ss-variant-grid">
                  {variants.map((variant: any, idx: number) => {
                    const selected = activeVariant?.name === variant.name;
                    return (
                      <button key={`${variant.name}-${idx}`} onClick={() => setSelectedVariant(variant)} disabled={Number(variant.stock) <= 0} className={`ss-variant-button ${selected ? 'is-active' : ''}`} type="button">
                        <strong>{variant.name}</strong><br />
                        <small>{Number(variant.stock) > 0 ? `${variant.stock} disponibles` : 'Agotado'}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="ss-buy-row">
              <div className="ss-qty-box">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} type="button">−</button>
                <span>{quantity}</span>
                <button onClick={() => setQuantity(Math.min(Math.max(availableStock, 1), quantity + 1))} type="button">+</button>
              </div>
              <button className="ss-btn" onClick={handleAddToCart} disabled={!inStock} type="button">
                {inStock ? 'Add to bag' : 'Sold out'} <ArrowRight size={16} />
              </button>
            </div>

            <div className="ss-trust-editorial" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '1.5rem' }}>
              <div><ShieldCheck size={18} /><strong>Secure</strong><p>Pago protegido.</p></div>
              <div><Truck size={18} /><strong>Track</strong><p>Pedido rastreable.</p></div>
              <div><Sparkles size={18} /><strong>Edit</strong><p>Selección curada.</p></div>
            </div>

            <div className="ss-accordions">
              <div className="ss-accordion-item">
                <h3>Editorial notes</h3>
                <p>{product.long_description || product.description || 'Producto elegido para una rutina clara, estética y fácil de sostener.'}</p>
              </div>
              {Array.isArray(ingredients) && ingredients.length > 0 && (
                <div className="ss-accordion-item">
                  <h3>Ingredientes destacados</h3>
                  <p>{ingredients.join(', ')}</p>
                </div>
              )}
              <div className="ss-accordion-item">
                <h3>Compra con claridad</h3>
                <ul>
                  <li><CheckCircle2 size={14} style={{ display: 'inline', marginRight: '.45rem' }} />Total visible antes del pago.</li>
                  <li><CheckCircle2 size={14} style={{ display: 'inline', marginRight: '.45rem' }} />Confirmación por correo.</li>
                  <li><CheckCircle2 size={14} style={{ display: 'inline', marginRight: '.45rem' }} />Políticas disponibles.</li>
                </ul>
              </div>
            </div>
          </section>
        </main>

        {similarProducts.length > 0 && (
          <section className="ss-editorial-section">
            <div className="ss-section-head">
              <div>
                <p className="ss-topline">More from the edit</p>
                <h2 className="ss-section-title ss-display">RELATED<br />PIECES</h2>
              </div>
            </div>
            <div className="ss-collection-grid">
              {similarProducts.map((similar: any) => <EditorialProductCard key={similar.id} product={similar} />)}
            </div>
          </section>
        )}

        <section className="ss-editorial-section">
          <div className="ss-section-head">
            <div>
              <p className="ss-topline">Community</p>
              <h2 className="ss-section-title ss-display">REVIEWS</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2"><ReviewList productId={product.id} themeColor="#0b0b0a" /></div>
            <div>{isSignedIn ? <ReviewForm productId={product.id} themeColor="#0b0b0a" /> : <div className="border p-8" style={{ borderColor: 'var(--ss-line)' }}>Inicia sesión para escribir una reseña.</div>}</div>
          </div>
        </section>

        <EditorialFooter storeName={currentStore.name || 'Selfcare Sinners'} />
        <MobileEditorialNav cartCount={cartItemCount} onCartOpen={() => setIsCartOpen(true)} />
        <CartDrawer storeId={(currentStore as any)?.id} themeColor="#0b0b0a" buttonColor="#0b0b0a" />
      </div>
    </>
  );
}
