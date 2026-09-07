import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SEO } from '../../components/SEO';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../App';
import { UixPageShell } from '../../components/uix/UixPageShell';
import { UixStatePanel } from '../../components/uix/UixStatePanel';

export function WishlistPage() {
  const { data: wishlistItems, isLoading, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();

  return (
    <UixPageShell mainClassName="uix-customer-page">
      <SEO title="Wishlist | Selfcare Sinners" />
      <section className="uix-customer-hero" data-uix-system-c="wishlist-hero">
        <div>
          <p className="uix-eyebrow">Favoritos</p>
          <h1>Tu wishlist</h1>
          <p>Guarda productos, compara rituales y vuelve a comprar sin perder lo que te gustó.</p>
        </div>
        <Link to="/" className="uix-action-secondary"><ShoppingBag size={16} /> Seguir comprando</Link>
      </section>

      {isLoading ? (
        <UixStatePanel tone="loading" title="Cargando wishlist" description="Estamos recuperando tus productos guardados." />
      ) : wishlistItems.length === 0 ? (
        <UixStatePanel tone="empty" title="Tu wishlist está vacía" description="Guarda productos desde el catálogo para construir tu próxima rutina." actionText="Explorar productos" actionTo="/" />
      ) : (
        <section className="uix-product-grid" data-uix-system-c="wishlist-grid">
          {wishlistItems.map((product: any) => (
            <article key={product.id} className="uix-wishlist-card">
              <Link to={`/product/${product.id}`} className="uix-wishlist-card__image">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.name} loading="lazy" />
                ) : (
                  <span>Sin imagen</span>
                )}
              </Link>
              <div className="uix-wishlist-card__body">
                <div>
                  <p className="uix-eyebrow">Guardado</p>
                  <Link to={`/product/${product.id}`}><h2>{product.name}</h2></Link>
                  <strong>MXN ${Number(product.price).toFixed(2)}</strong>
                </div>
                <div className="uix-wishlist-card__actions">
                  <button
                    type="button"
                    onClick={() => {
                      addItem({ id: product.id, productId: product.id, name: product.name, price: product.price, quantity: 1, image: product.images?.[0] });
                      toast.success('Añadido al carrito');
                    }}
                    className="uix-action-primary"
                  >
                    <ShoppingBag size={16} /> Añadir
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      removeFromWishlist(product.id);
                      toast.success('Eliminado de favoritos');
                    }}
                    className="uix-icon-action"
                    aria-label="Eliminar de wishlist"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </div>
              <Heart className="uix-wishlist-card__heart" size={18} aria-hidden="true" />
            </article>
          ))}
        </section>
      )}
    </UixPageShell>
  );
}
