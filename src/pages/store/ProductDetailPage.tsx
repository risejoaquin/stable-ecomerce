import { StoreHeader } from '../../components/storefront/StoreHeader';
import { WishlistButton } from '../../components/storefront/WishlistButton';
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCart, CartDrawer } from '../../App';
import { useApiClient } from '../../api/useApiClient';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { ReviewList } from '../../components/reviews/ReviewList';
import { ReviewForm } from '../../components/reviews/ReviewForm';
import { StarRating } from '../../components/reviews/StarRating';
import { useProductRating } from '../../hooks/useReviews';
import { useAuthSafe as useAuth } from '../../hooks/useAuthSafe';
import { SEO } from '../../components/SEO';
import { ShoppingBag, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ProductDetailPage() {
  const { id } = useParams();
  const apiClient = useApiClient();
  const { items, setIsCartOpen, addItem } = useCart();
  const { data: store, isLoading: isStoreLoading } = useStoreConfig();
  const { data: ratingData } = useProductRating(id || '');
  const { isSignedIn } = useAuth();

  const { data: product, isLoading: isProductLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: () => apiClient.get(`/products/${id}`),
    enabled: !!id
  });

  if (isStoreLoading || isProductLoading) return <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">Loading...</div>;
  if (!product) return <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">Product not found</div>;

  const currentStore = store || { name: 'My Store', config: {}, description: '' };
  const config = currentStore.config || {};
  const themeColor = config.themeColor || '#6B705C';
  const secondaryColor = config.secondaryColor || '#A5A58D';
  const backgroundColor = config.backgroundColor || '#FDFCFB';
  const textColor = config.textColor || '#333333';
  const buttonColor = config.buttonColor || themeColor;
  const fontFamily = config.fontFamily === 'Playfair Display' ? '"Playfair Display", serif' : 
                     config.fontFamily === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : 
                     '"Inter", sans-serif';

  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  return (
    <>
      <SEO title={`${product.name} - ${currentStore.name}`} description={product.description} />
      <div className="min-h-screen flex flex-col" style={{ backgroundColor, color: textColor, fontFamily }}>
        
        {/* Header */}
        <StoreHeader backButton />

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            <div className="bg-gray-50 aspect-square rounded-2xl overflow-hidden flex items-center justify-center">
               {product.images && product.images[0] ? (
                 <img src={product.images[0]} alt={product.name}  className="w-full h-full object-cover" loading="lazy" />
               ) : (
                 <div className="text-gray-400">No Image</div>
               )}
            </div>
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl font-bold mb-4">{product.name}</h1>
              
              {ratingData && ratingData.count > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <StarRating rating={ratingData.average} color={themeColor} size={20} />
                  <span className="text-sm font-medium" style={{ color: secondaryColor }}>{ratingData.average.toFixed(1)} ({ratingData.count} reviews)</span>
                </div>
              )}

              <p className="text-2xl font-semibold mb-8" style={{ color: themeColor }}>${Number(product.price).toFixed(2)}</p>
              <p className="text-lg opacity-80 mb-8 leading-relaxed" style={{ color: secondaryColor }}>{product.description}</p>
              
              <button 
                onClick={() => {
                  addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, image: product.images?.[0] });
                  toast.success('Added to cart');
                }}
                className="px-8 py-4 text-white text-lg font-medium rounded-xl transition-opacity hover:opacity-90 active:scale-95"
                style={{ backgroundColor: buttonColor }}
              >
                Add to Cart
              </button>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="mt-24 border-t pt-16" style={{ borderColor: secondaryColor + '30' }}>
            <h2 className="text-3xl font-bold mb-10" style={{ color: textColor }}>Customer Reviews</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <ReviewList productId={product.id} themeColor={buttonColor} />
              </div>
              <div>
                {isSignedIn ? (
                  <ReviewForm productId={product.id} themeColor={buttonColor} />
                ) : (
                  <div className="p-8 rounded-2xl border bg-gray-50 text-center">
                    <p className="text-gray-600 mb-4">Please sign in to write a review.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <CartDrawer storeId={currentStore?.id} themeColor={themeColor} />
      </div>
    </>
  );
}
