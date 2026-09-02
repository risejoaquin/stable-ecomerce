import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Heart, Plus } from 'lucide-react';
import { productCanonicalPath } from '../../lib/seo';
import { useCart } from '../../App';
import { WishlistButton } from '../storefront/WishlistButton';

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
      body: JSON.stringify({ event_type: type, session_id: sessionId, source: 'editorial_storefront', metadata })
    }).catch(() => undefined);
  } catch (_) {}
}

export function EditorialProductCard({ product }: { product: any }) {
  const { addItem } = useCart();
  const hasVariants = product.variants && product.variants.length > 0;
  const inStock = hasVariants ? product.variants.some((v: any) => Number(v.stock) > 0) : Number(product.stock) > 0;
  const price = Number(product.price || 0);

  const quickAdd = () => {
    if (hasVariants) return;
    if (!inStock) {
      toast.error('Producto agotado');
      return;
    }
    addItem({ id: product.id, productId: product.id, name: product.name, price, quantity: 1, image: product.images?.[0] });
    trackMarketingEvent('add_to_cart', { product_id: product.id, product_name: product.name, price });
    toast.success('Agregado al carrito');
  };

  return (
    <article className="ss-product-card">
      {!inStock && <span className="ss-badge">Sold out</span>}
      {inStock && (product.featured || product.is_featured) && <span className="ss-badge">Edit pick</span>}
      <Link className="ss-product-image" to={productCanonicalPath(product)}>
        {product.images?.[0] ? <img src={product.images[0]} alt={product.name} loading="lazy" /> : <div className="absolute inset-0 flex items-center justify-center opacity-45">No image</div>}
      </Link>
      <div className="ss-card-body">
        <p className="ss-card-kicker">{product.category || product.brand || 'Selfcare edit'}</p>
        <Link to={productCanonicalPath(product)}><h3 className="ss-card-title ss-display">{product.name}</h3></Link>
        <div className="ss-card-meta">
          <span>MXN ${price.toFixed(2)}</span>
          <span>{hasVariants ? `${product.variants.length} options` : inStock ? 'In stock' : 'Out'}</span>
        </div>
        <div className="ss-card-actions">
          {hasVariants ? <Link className="ss-mini-btn primary" to={productCanonicalPath(product)}>View options</Link> : <button className="ss-mini-btn primary" disabled={!inStock} onClick={quickAdd} type="button"><Plus size={14} /> Add</button>}
          <WishlistButton productId={product.id} className="ss-mini-btn" />
        </div>
      </div>
    </article>
  );
}
