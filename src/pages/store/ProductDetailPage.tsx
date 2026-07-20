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

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

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

  const hasVariants = product.variants && product.variants.length > 0;
  const inStock = hasVariants 
    ? (selectedVariant ? product.variants.find((v: any) => v.name === selectedVariant)?.stock > 0 : product.variants.some((v: any) => v.stock > 0))
    : product.stock > 0;

  const handleAddToCart = () => {
    if (hasVariants && !selectedVariant) {
      toast.error('Please select an option first');
      return;
    }
    const itemName = hasVariants ? `${product.name} - ${selectedVariant}` : product.name;
    addItem({ id: hasVariants ? `${product.id}-${selectedVariant}` : product.id, name: itemName, price: product.price, quantity: 1, image: product.images?.[0] });
    toast.success('Added to cart');
  };

  return (
    <>
      <SEO title={`${product.name} - ${currentStore.name}`} description={product.description} />
      <div className="min-h-screen flex flex-col" style={{ backgroundColor, color: textColor, fontFamily }}>
        
        {/* Header */}
        <StoreHeader backButton />

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full py-8 sm:py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            
            {/* Image Gallery */}
            <div className="flex flex-col gap-4">
              <div className="bg-gray-50 aspect-square rounded-2xl overflow-hidden flex items-center justify-center relative">
                <WishlistButton productId={product.id} className="absolute top-4 right-4 z-10 p-3 shadow-md border border-gray-100" />
                {product.images && product.images[selectedImageIndex] ? (
                  <img src={product.images[selectedImageIndex]} alt={product.name} className="w-full h-full object-cover transition-opacity duration-300" loading="lazy" />
                ) : (
                  <div className="text-gray-400">No Image</div>
                )}
              </div>
              
              {/* Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                  {product.images.map((img: string, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-colors ${selectedImageIndex === idx ? 'border-black' : 'border-transparent'}`}
                      style={{ borderColor: selectedImageIndex === idx ? themeColor : 'transparent' }}
                    >
                      <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover opacity-80 hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="flex flex-col justify-start pt-4">
              <div className="mb-2 flex items-center gap-2">
                {product.brand && (
                  <span className="text-sm font-bold uppercase tracking-wider" style={{ color: secondaryColor }}>{product.brand}</span>
                )}
                {product.category && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm" style={{ color: secondaryColor }}>{product.category}</span>
                  </>
                )}
                {product.subcategory && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm" style={{ color: secondaryColor }}>{product.subcategory}</span>
                  </>
                )}
              </div>
              
              <h1 className="text-4xl font-bold mb-4 leading-tight">{product.name}</h1>
              
              {ratingData && ratingData.count > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <StarRating rating={ratingData.average} color={themeColor} size={20} />
                  <span className="text-sm font-medium" style={{ color: secondaryColor }}>{ratingData.average.toFixed(1)} ({ratingData.count} reviews)</span>
                </div>
              )}

              <p className="text-2xl font-semibold mb-6" style={{ color: themeColor }}>MXN ${Number(product.price).toFixed(2)}</p>
              
              <div className="prose prose-sm md:prose-base mb-8">
                <p className="opacity-80 leading-relaxed" style={{ color: textColor }}>{product.description}</p>
              </div>
              
              {/* Variants Selector */}
              {hasVariants && (
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-3 uppercase tracking-wider text-gray-500">Select Option</label>
                  <div className="flex flex-wrap gap-3">
                    {product.variants.map((v: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedVariant(v.name)}
                        disabled={v.stock <= 0}
                        className={`px-5 py-2.5 rounded-lg border-2 text-sm font-medium transition-all
                          ${selectedVariant === v.name ? 'border-current shadow-sm' : 'border-gray-200 hover:border-gray-300 text-gray-600'}
                          ${v.stock <= 0 ? 'opacity-40 cursor-not-allowed line-through' : 'cursor-pointer'}
                        `}
                        style={{ 
                          borderColor: selectedVariant === v.name ? buttonColor : '',
                          color: selectedVariant === v.name ? buttonColor : '' 
                        }}
                      >
                        {v.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {!inStock && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl font-medium border border-red-100">
                  Agotado
                </div>
              )}
              
              <button 
                onClick={handleAddToCart}
                disabled={!inStock}
                className="px-8 py-4 text-white text-lg font-medium rounded-xl transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
                style={{ backgroundColor: buttonColor }}
              >
                {inStock ? 'Añadir al Carrito' : 'Sold Out'}
              </button>
            </div>
          </div>

          {/* Reseñas Section */}
          <div className="mt-24 border-t pt-16" style={{ borderColor: secondaryColor + '30' }}>
            <h2 className="text-3xl font-bold mb-10" style={{ color: textColor }}>Customer Reseñas</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <ReviewList productId={product.id} themeColor={buttonColor} />
              </div>
              <div>
                {isSignedIn ? (
                  <ReviewForm productId={product.id} themeColor={buttonColor} />
                ) : (
                  <div className="p-8 rounded-2xl border bg-gray-50 text-center">
                    <p className="text-gray-600 mb-4">Inicia sesión para escribir una reseña.</p>
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
