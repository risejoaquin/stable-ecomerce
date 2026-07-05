import React from 'react';
import { useProducts } from '../../hooks/useProducts';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { ProductCard } from '../../components/storefront/ProductCard';
import { useCart, CartDrawer } from '../../App';

export function HomePage() {
  const { data: store, isLoading: isStoreLoading } = useStoreConfig(); 
  const { data: products, isLoading: isProductsLoading } = useProducts(store?.slug);
  const { items, setIsCartOpen } = useCart();

  if (isStoreLoading) return <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">Loading...</div>;

  const currentStore = store || { name: 'Terra & Tide', config: { themeColor: '#6B705C' } };
  const currentProducts = products || [];
  const themeColor = currentStore.config?.themeColor || '#6B705C';
  const cartItemCount = items.reduce((acc: number, item: any) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-[#333]" style={{ '--theme-color': themeColor } as React.CSSProperties}>
      <header className="h-20 px-8 max-w-7xl mx-auto flex items-center justify-between border-b border-[#F0EFE9]">
        <span className="font-serif italic text-2xl font-bold" style={{ color: themeColor }}>{currentStore.name}</span>
        <div className="flex gap-4">
          <div 
            onClick={() => setIsCartOpen(true)}
            className="w-10 h-10 rounded-full border border-[#E5E5E1] flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors relative"
          >
            <span className="material-symbols-outlined text-sm" style={{ color: themeColor }}>shopping_bag</span>
            {cartItemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: themeColor }}>
                {cartItemCount}
              </span>
            )}
          </div>
        </div>
      </header>
      <div className="p-8 max-w-7xl mx-auto">
        <h1 className="font-serif text-4xl mb-2 text-[#333]">New Arrivals</h1>
        <p className="text-[#A5A58D] text-sm">Explore our latest handcrafted collection.</p>
        
        {isProductsLoading ? (
          <p className="mt-10 text-gray-500">Loading products...</p>
        ) : (
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
            {currentProducts.map((p: any) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
      <CartDrawer storeId={currentStore?.id} themeColor={themeColor} />
    </div>
  );
}
