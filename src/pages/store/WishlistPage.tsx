import { EmptyState } from '../../components/EmptyState';
import React from 'react';
import { useWishlist } from '../../hooks/useWishlist';
import { useCart } from '../../App';
import { Link } from 'react-router-dom';
import { Trash2, ShoppingBag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SEO } from '../../components/SEO';
import { useStoreConfig } from '../../hooks/useStoreConfig';

export function WishlistPage() {
  const { data: wishlistItems, isLoading, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();
  const { data: store } = useStoreConfig();

  const themeColor = store?.config?.themeColor || '#6B705C';

  return (
    <>
      <SEO title="My Wishlist" />
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 min-h-[60vh]">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-serif text-[#333]">My Wishlist</h1>
          <Link to="/" className="text-sm font-medium underline" style={{ color: themeColor }}>Continue Shopping</Link>
        </div>

        {isLoading ? (
          <div className="py-20 text-center opacity-50">Loading wishlist...</div>
        ) : wishlistItems.length === 0 ? (
          <EmptyState title="Your wishlist is empty" description="Save items you like and they will appear here." actionText="Explore Products" actionLink="/" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {wishlistItems.map((product: any) => (
              <div key={product.id} className="group overflow-hidden flex flex-col bg-white border border-gray-100 rounded-xl transition-shadow hover:shadow-lg">
                <Link to={`/product/${product.id}`} className="aspect-square bg-gray-50 overflow-hidden relative block">
                  {product.images && product.images[0] ? (
                    <img src={product.images[0]} alt={product.name}  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">No Image</div>
                  )}
                </Link>
                <div className="p-4 flex flex-col flex-1">
                  <Link to={`/product/${product.id}`}><h3 className="font-bold text-base mb-1 line-clamp-1 hover:underline text-gray-900">{product.name}</h3></Link>
                  <p className="font-semibold text-lg mb-4" style={{ color: themeColor }}>${Number(product.price).toFixed(2)}</p>
                  
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => {
                        addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, image: product.images?.[0] });
                        toast.success('Added to cart');
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90 active:scale-95" 
                      style={{ backgroundColor: themeColor }}
                    >
                      <ShoppingBag size={16} /> Add to Cart
                    </button>
                    <button 
                      onClick={() => {
                        removeFromWishlist(product.id);
                        toast.success('Removed from wishlist');
                      }}
                      className="p-2 border border-gray-200 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
                      title="Remove"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
