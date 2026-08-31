import { StoreHeader } from '../../components/storefront/StoreHeader';
import { WishlistButton } from '../../components/storefront/WishlistButton';
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart, CartDrawer } from '../../App';
import { useApiClient } from '../../api/useApiClient';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { useSearchProducts } from '../../hooks/useSearchProducts';
import { StyledProductCard } from '../../pages/store/HomePage';
import { ReviewList } from '../../components/reviews/ReviewList';
import { ReviewForm } from '../../components/reviews/ReviewForm';
import { StarRating } from '../../components/reviews/StarRating';
import { useProductRating } from '../../hooks/useReviews';
import { useAuthSafe as useAuth } from '../../hooks/useAuthSafe';
import { SEO } from '../../components/SEO';
import { ArrowLeft, CheckCircle2, HeartHandshake, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { productCanonicalPath, productJsonLd, stripHtml } from '../../lib/seo';

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
      body: JSON.stringify({ event_type: type, session_id: sessionId, source: 'product_detail', product_id: metadata.product_id, metadata })
    }).catch(() => undefined);
  } catch (_) {
    // Analytics must never block product browsing.
  }
}

export function ProductDetailPage() {
  const { id } = useParams();
  const apiClient = useApiClient();
  const { setIsCartOpen, addItem } = useCart();
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
    if (id) trackMarketingEvent('product_view', { product_id: id });
  }, [id]);

  const { data: similarProductsResult } = useSearchProducts(
    store?.slug,
    { category: (product?.categories && product.categories.length > 0) ? product.categories[0] : (product?.category || ''), pageSize: 4 },
  );
  const similarProducts = similarProductsResult?.data?.filter((p: any) => p.id !== product?.id).slice(0, 3) || [];

  if (isStoreLoading || isProductLoading) return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">Cargando producto...</div>;
  if (!product) return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">Producto no encontrado</div>;

  const currentStore = store || { name: 'Selfcare Sinners', config: {}, description: '' };
  const config = currentStore.config || {};
  const themeColor = config.themeColor || '#6B705C';
  const secondaryColor = config.secondaryColor || '#A5A58D';
  const backgroundColor = config.backgroundColor || '#FDFCFB';
  const textColor = config.textColor || '#333333';
  const buttonColor = config.buttonColor || themeColor;
  const fontFamily = config.fontFamily === 'Playfair Display' ? '"Playfair Display", serif' : config.fontFamily === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : '"Inter", sans-serif';

  const variants = Array.isArray(product.variants) ? product.variants : [];
  const hasVariants = variants.length > 0;
  const activeVariant = selectedVariant || variants.find((v: any) => Number(v.stock) > 0) || null;
  const availableStock = hasVariants ? Number(activeVariant?.stock || 0) : Number(product.stock || 0);
  const inStock = availableStock > 0;
  const price = Number(activeVariant?.price || product.price || 0);
  const sku = activeVariant?.sku || product.sku;
  const ingredients = product.ingredients || product.config?.ingredients || [];

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
      <SEO title={product.seo_title || product.name} description={stripHtml(product.seo_description || product.description || product.long_description)} image={product.images?.[0]} canonicalPath={productCanonicalPath(product)} type="product" jsonLd={productJsonLd(product, currentStore.name)} />
      <div className="min-h-screen flex flex-col" style={{ backgroundColor, color: textColor, fontFamily }}>
        <StoreHeader backButton />
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full py-8 sm:py-12">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold mb-6 opacity-70 hover:opacity-100"><ArrowLeft size={16} /> Volver al catálogo</Link>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_0.9fr] gap-8 md:gap-12">
            <div className="flex flex-col gap-4">
              <div className="bg-gray-50 aspect-square rounded-[2rem] overflow-hidden flex items-center justify-center relative border" style={{ borderColor: secondaryColor + '25' }}>
                <WishlistButton productId={product.id} className="absolute top-4 right-4 z-10 p-3 shadow-md border border-gray-100" />
                {product.images?.[selectedImageIndex] ? <img src={product.images[selectedImageIndex]} alt={product.name} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" /> : <div className="text-gray-400">Sin imagen</div>}
              </div>
              {product.images?.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                  {product.images.map((img: string, idx: number) => (
                    <button key={idx} onClick={() => setSelectedImageIndex(idx)} className="flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border-2 transition-colors" style={{ borderColor: selectedImageIndex === idx ? themeColor : 'transparent' }}>
                      <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <section className="bg-white rounded-[2rem] p-5 sm:p-8 border h-fit" style={{ borderColor: secondaryColor + '30' }}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest" style={{ color: themeColor }}><Sparkles size={14} /> Selfcare Sinners</span>
                {product.brand && <span className="text-xs font-bold uppercase tracking-wider opacity-50">{product.brand}</span>}
                {product.category && <span className="text-xs opacity-50">{product.category}</span>}
              </div>
              <h1 className="text-3xl sm:text-5xl font-black mb-4 leading-tight">{product.name}</h1>
              {ratingData && ratingData.count > 0 ? (
                <div className="flex items-center gap-3 mb-5"><StarRating rating={ratingData.average} color={themeColor} size={20} /><span className="text-sm font-medium opacity-65">{ratingData.average.toFixed(1)} · {ratingData.count} reseñas</span></div>
              ) : <p className="text-sm opacity-55 mb-5">Sé la primera persona en dejar una reseña.</p>}
              <p className="text-3xl font-black mb-2" style={{ color: themeColor }}>MXN ${price.toFixed(2)}</p>
              {sku && <p className="text-xs uppercase tracking-widest opacity-50 mb-6">SKU {sku}</p>}
              <p className="opacity-80 leading-relaxed mb-8">{product.description}</p>

              {hasVariants && (
                <div className="mb-8">
                  <label className="block text-xs font-black mb-3 uppercase tracking-[0.2em] opacity-50">Elige presentación</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {variants.map((v: any, idx: number) => {
                      const selected = activeVariant?.name === v.name;
                      return <button key={`${v.name}-${idx}`} onClick={() => setSelectedVariant(v)} disabled={Number(v.stock) <= 0} className="text-left px-4 py-3 rounded-2xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed" style={{ borderColor: selected ? buttonColor : '#E5E5E1', backgroundColor: selected ? buttonColor + '10' : 'white' }}>
                        <span className="block font-bold">{v.name}</span>
                        <span className="text-xs opacity-60">{Number(v.stock) > 0 ? `${v.stock} disponibles` : 'Agotado'}</span>
                      </button>;
                    })}
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-[130px_1fr] gap-3 mb-5">
                <div className="flex items-center justify-between rounded-2xl border px-4 py-3" style={{ borderColor: secondaryColor + '35' }}>
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="font-black text-xl">-</button>
                  <span className="font-bold">{quantity}</span>
                  <button onClick={() => setQuantity(Math.min(Math.max(availableStock, 1), quantity + 1))} className="font-black text-xl">+</button>
                </div>
                <button onClick={handleAddToCart} disabled={!inStock} className="px-8 py-4 text-white text-base font-black rounded-2xl transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: buttonColor }}>
                  {inStock ? 'Agregar al carrito' : 'Agotado'}
                </button>
              </div>
              <p className="text-xs opacity-55 mb-8">Stock disponible: {availableStock}. El inventario se confirma al completar el pago.</p>

              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-gray-50"><ShieldCheck size={18} className="mb-2" />Pago seguro</div>
                <div className="p-4 rounded-2xl bg-gray-50"><Truck size={18} className="mb-2" />Rastreo público</div>
                <div className="p-4 rounded-2xl bg-gray-50"><HeartHandshake size={18} className="mb-2" />Soporte claro</div>
              </div>
            </section>
          </div>

          <section className="mt-14 grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-3xl p-6 border" style={{ borderColor: secondaryColor + '30' }}>
              <h2 className="text-2xl font-black mb-4">Detalles de uso</h2>
              <div className="prose prose-sm max-w-none opacity-80">
                <p>{product.long_description || product.description || 'Producto seleccionado para complementar una rutina de skincare consciente.'}</p>
                {Array.isArray(ingredients) && ingredients.length > 0 && <p><strong>Ingredientes destacados:</strong> {ingredients.join(', ')}</p>}
                <p><strong>Recomendación:</strong> prueba de parche, uso consistente y protección solar cuando aplique.</p>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 border" style={{ borderColor: secondaryColor + '30' }}>
              <h2 className="text-2xl font-black mb-4">Compra con claridad</h2>
              <ul className="space-y-3 text-sm opacity-75">
                <li className="flex gap-2"><CheckCircle2 size={16} /> Total visible antes del pago.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} /> Confirmación por correo.</li>
                <li className="flex gap-2"><CheckCircle2 size={16} /> Políticas siempre disponibles.</li>
              </ul>
            </div>
          </section>

          {similarProducts.length > 0 && (
            <section className="mt-20 border-t pt-14" style={{ borderColor: secondaryColor + '30' }}>
              <h2 className="text-3xl font-black mb-8">También te puede interesar</h2>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {similarProducts.map((p: any) => <StyledProductCard key={p.id} product={p} config={config} themeColor={themeColor} textColor={textColor} />)}
              </div>
            </section>
          )}

          <section className="mt-20 border-t pt-14" style={{ borderColor: secondaryColor + '30' }}>
            <h2 className="text-3xl font-black mb-8">Reseñas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              <div className="lg:col-span-2"><ReviewList productId={product.id} themeColor={buttonColor} /></div>
              <div>{isSignedIn ? <ReviewForm productId={product.id} themeColor={buttonColor} /> : <div className="p-8 rounded-2xl border bg-gray-50 text-center"><p className="text-gray-600 mb-4">Inicia sesión para escribir una reseña.</p></div>}</div>
            </div>
          </section>
        </main>
        <CartDrawer storeId={currentStore?.id} themeColor={themeColor} buttonColor={buttonColor} />
      </div>
    </>
  );
}
