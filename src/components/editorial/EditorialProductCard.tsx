import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Heart, Plus } from 'lucide-react';
import { productCanonicalPath } from '../../lib/seo';
import { useCart } from '../../App';
import { WishlistButton } from '../storefront/WishlistButton';
import { trackMarketingEvent } from '../../lib/analytics';

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
    trackMarketingEvent('add_to_cart', { product_id: product.id, product_name: product.name, price }, { source: 'product_card' });
    toast.success('Agregado al carrito');
  };

  return (
    <article className="ss-product-card">
      {!inStock && <span className="ss-badge">Agotado</span>}
      {inStock && (product.featured || product.is_featured) && <span className="ss-badge">Bestseller</span>}
      <Link className="ss-product-image" to={productCanonicalPath(product)}>
        {product.images?.[0] ? <img src={product.images[0]} alt={product.name} loading="lazy" /> : <div className="absolute inset-0 flex items-center justify-center opacity-45">No image</div>}
      </Link>
      <div className="ss-card-body">
        <p className="ss-card-kicker">{product.category || product.brand || 'Rutina Selfcare'}</p>
        <Link to={productCanonicalPath(product)}><h3 className="ss-card-title ss-display">{product.name}</h3></Link>
        <div className="ss-card-meta">
          <span>MXN ${price.toFixed(2)}</span>
          <span>{hasVariants ? `${product.variants.length} opciones` : inStock ? 'Disponible' : 'Agotado'}</span>
        </div>
        <div className="ss-card-actions">
          {hasVariants ? <Link className="ss-mini-btn primary" to={productCanonicalPath(product)}>Ver opciones</Link> : <button className="ss-mini-btn primary" disabled={!inStock} onClick={quickAdd} type="button"><Plus size={14} /> Añadir</button>}
          <WishlistButton productId={product.id} className="ss-mini-btn" />
        </div>
      </div>
    </article>
  );
}
