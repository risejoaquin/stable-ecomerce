import { Heart } from 'lucide-react';
import { WishlistButton } from '../../components/storefront/WishlistButton';
import { HeroBanner } from '../../components/store/HeroBanner';
import { Link } from 'react-router-dom';
import { useProductRating } from '../../hooks/useReviews';
import { StarRating } from '../../components/reviews/StarRating';
import React, { useEffect, useState } from 'react';
import { useSearchProducts } from '../../hooks/useSearchProducts';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { ProductCard } from '../../components/storefront/ProductCard';
import { useCart, CartDrawer } from '../../App';
import { ShoppingBag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { SearchBar } from '../../components/storefront/SearchBar';
import { ProductFilters } from '../../components/storefront/ProductFilters';
import { Pagination } from '../../components/storefront/Pagination';
import { SEO } from '../../components/SEO';

export function HomePage() {
  const { data: store, isLoading: isStoreLoading } = useStoreConfig(); 
  const [filters, setFilters] = useState({ search: '', minPrice: '', maxPrice: '', sortBy: 'created_at', order: 'desc', page: 1, pageSize: 12 });
  const { data: searchResult, isLoading: isProductsLoading } = useSearchProducts(store?.slug, filters);
  const { items, setIsCartOpen } = useCart();

  useEffect(() => {
    // Dynamic Font Loading
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
      if (font === 'Playfair Display') {
        link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap';
      } else if (font === 'Space Grotesk') {
        link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap';
      } else {
        link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap';
      }
    }
  }, [store?.config?.fontFamily]);

  if (isStoreLoading) return <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">Loading...</div>;

  const currentStore = store || { name: 'My Store', config: {}, description: '' };
  const currentProducts = searchResult?.data || [];
  const totalPages = searchResult ? Math.ceil(searchResult.total / searchResult.pageSize) : 1;
  const config = currentStore.config || {};
  
  const themeColor = config.themeColor || '#6B705C';
  const secondaryColor = config.secondaryColor || '#A5A58D';
  const backgroundColor = config.backgroundColor || '#FDFCFB';
  const textColor = config.textColor || '#333333';
  const layout = config.layout || 'grid';
  const borderRadius = config.borderRadius || 'xl';
  const fontFamily = config.fontFamily === 'Playfair Display' ? '"Playfair Display", serif' : 
                     config.fontFamily === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : 
                     '"Inter", sans-serif';

  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  return (
    <>
    <SEO title={currentStore.name} description={currentStore.description} />
    <div className="min-h-screen flex flex-col" style={{ 
      backgroundColor, 
      color: textColor, 
      fontFamily,
      '--theme-color': themeColor,
      '--secondary-color': secondaryColor,
      '--border-radius-base': borderRadius === 'none' ? '0px' : borderRadius === 'sm' ? '4px' : borderRadius === 'md' ? '8px' : borderRadius === 'lg' ? '16px' : borderRadius === 'xl' ? '24px' : '9999px',
      '--border-radius-sm': borderRadius === 'none' ? '0px' : borderRadius === 'sm' ? '2px' : borderRadius === 'md' ? '4px' : borderRadius === 'lg' ? '8px' : borderRadius === 'xl' ? '12px' : '9999px',
    } as React.CSSProperties}>
      
      {/* Header */}
      <header className="h-20 px-8 max-w-7xl mx-auto w-full flex items-center justify-between border-b" style={{ borderColor: secondaryColor + '30' }}>
        <a href="/" className="flex items-center">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt={currentStore.name}  className="h-10 object-contain" loading="lazy" />
          ) : (
            <span className="text-2xl font-bold tracking-tight" style={{ color: themeColor }}>{currentStore.name}</span>
          )}
        </a>
        <div className="flex gap-4">
                    <Link to="/wishlist" className="w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors relative" style={{ borderColor: secondaryColor + '40', backgroundColor: backgroundColor }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = secondaryColor + '10'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = backgroundColor}>
            <Heart size={20} style={{ color: themeColor }} />
          </Link>
          <button 
            onClick={() => setIsCartOpen(true)}
            className="w-11 h-11 rounded-full border flex items-center justify-center cursor-pointer transition-colors relative"
            style={{ borderColor: secondaryColor + '40', backgroundColor: backgroundColor }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = secondaryColor + '10'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = backgroundColor}
          >
            <ShoppingBag size={20} style={{ color: themeColor }} />
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: themeColor }}>
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      {(layout === 'hero' || config.heroBanner?.image) && (
        <div className="relative w-full h-[50vh] min-h-[400px] flex items-center justify-center text-center p-8 bg-gray-100 overflow-hidden"
             style={{
               backgroundImage: config.heroBanner?.image ? `url(${config.heroBanner.image})` : 'none',
               backgroundSize: 'cover',
               backgroundPosition: 'center',
             }}>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative z-10 text-white max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">{config.heroBanner?.title || 'Welcome'}</h1>
            <p className="text-xl md:text-2xl opacity-90 font-light">{config.heroBanner?.subtitle || 'Discover our collection'}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {(!config.heroBanner?.image && layout !== 'hero') && (
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight" style={{ color: textColor }}>{config.heroBanner?.title || 'New Arrivals'}</h1>
            <p className="text-lg opacity-70" style={{ color: secondaryColor }}>{config.heroBanner?.subtitle || 'Explore our latest collection.'}</p>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-6">
            <SearchBar onSearch={(search) => setFilters(prev => ({ ...prev, search, page: 1 }))} />
            <ProductFilters filters={filters} setFilters={(f: any) => { 
                if (typeof f === 'function') {
                    setFilters((prev) => {
                        const newF = f(prev);
                        return { ...newF, page: 1 };
                    });
                } else {
                    setFilters({ ...f, page: 1 });
                }
            }} />
          </div>
          
          <div className="flex-1 w-full">
            {isProductsLoading ? (
              <div className="py-20 text-center opacity-50">Loading products...</div>
            ) : (
              <>
                <div className={`grid gap-8 ${layout === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'}`}>
                  {currentProducts.map((p: any) => (
                    <StyledProductCard key={p.id} product={p} config={config} themeColor={themeColor} textColor={textColor} />
                  ))}
                </div>
                {currentProducts.length === 0 && (
                  <div className="text-center py-20 opacity-50">No products found.</div>
                )}
                <Pagination page={filters.page} totalPages={totalPages} setPage={(page) => setFilters(prev => ({ ...prev, page }))} themeColor={themeColor} />
              </>
            )}
          </div>
        </div>
      </main>

      
      {/* Footer */}
      <footer className="mt-auto py-10 border-t text-sm" style={{ borderColor: secondaryColor + '30', color: secondaryColor }}>
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>{config.footerText || `© ${new Date().getFullYear()} ${currentStore.name}`}</div>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="/contact" className="hover:underline">Contact</Link>
            <Link to="/returns" className="hover:underline">Return Policy</Link>
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link to="/terms" className="hover:underline">Terms & Conditions</Link>
          </div>
        </div>
      </footer>


      <CartDrawer storeId={currentStore?.id} themeColor={themeColor} buttonColor={config.buttonColor || themeColor} />
    </div>
    </>
  );
}

const StyledProductCard: React.FC<{ product: any, config: any, themeColor: string, textColor: string }> = ({ product, config, themeColor, textColor }) => {
  const { addItem } = useCart();
  const isList = config.layout === 'list';
  
  return (
    <div className={`group overflow-hidden flex bg-white transition-transform hover:-translate-y-1 ${isList ? 'flex-col sm:flex-row' : 'flex-col'}`} style={{
      borderRadius: 'var(--border-radius-base)',
      boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
    }}>
      <Link to={`/product/${product.id}`} className={`bg-gray-50 overflow-hidden relative block ${isList ? 'w-full sm:w-1/3 aspect-square sm:aspect-auto' : 'aspect-square'}`}>
        {product.images && product.images[0] ? (
          <img src={product.images[0]} alt={product.name}  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">No Image</div>
        )}
      </Link>
      <div className={`p-5 flex flex-col ${isList ? 'w-full sm:w-2/3 justify-center' : 'flex-1'}`}>
        
        <div className="flex justify-between items-start gap-4">
          <Link to={`/product/${product.id}`} className="flex-1"><h3 className="font-bold text-lg mb-1 line-clamp-1 hover:underline cursor-pointer" style={{ color: textColor }}>{product.name}</h3></Link>
          <WishlistButton productId={product.id} className="flex-shrink-0 -mt-1 -mr-1" />
        </div>
        <p className="opacity-70 text-sm line-clamp-2 mb-4 flex-1" style={{ color: config.secondaryColor || '#666' }}>{product.description}</p>
        <div className="flex items-center justify-between mt-auto pt-4 border-t" style={{ borderColor: (config.secondaryColor || '#ccc') + '30' }}>
          <p className="font-semibold text-lg" style={{ color: themeColor }}>${Number(product.price).toFixed(2)}</p>
          <button 
            onClick={() => {
              addItem({ id: product.id, name: product.name, price: product.price, quantity: 1, image: product.images?.[0] });
              toast.success('Added to cart');
            }}
            className="px-4 py-2 text-white text-sm font-medium transition-opacity hover:opacity-90 active:scale-95" 
            style={{ 
              backgroundColor: config.buttonColor || themeColor,
              borderRadius: 'var(--border-radius-sm)'
            }}
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}