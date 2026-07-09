import { useValidateCoupon } from './hooks/useCoupon';
import { CouponsPage } from './pages/admin/CouponsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProductDetailPage } from './pages/store/ProductDetailPage';
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter, Routes, Route, Outlet, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation, QueryCache, MutationCache } from '@tanstack/react-query';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ProductsPage } from './pages/admin/ProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { HomePage } from './pages/store/HomePage';
import { TrackOrderPage } from './pages/store/TrackOrderPage';
import { MyOrdersPage } from './pages/store/MyOrdersPage';
import { CheckoutSuccessPage } from './pages/store/CheckoutSuccessPage';
import { useCheckout } from './hooks/useCheckout';
import { useApiClient } from './api/useApiClient';
import type { Product, StoreConfig } from './types';

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error: any) => toast.error(error.message || 'Something went wrong'),
    onSuccess: () => toast.success('Action successful')
  }),
  queryCache: new QueryCache({
    onError: (error: any) => toast.error(error.message || 'Failed to fetch data')
  })
});
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: any) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
};

const CartContext = React.createContext<CartContextType | null>(null);

function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, image: product.images?.[0] }];
    });
    setIsCartOpen(true);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) return removeItem(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };
  const clearCart = () => setItems([]);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, total, isCartOpen, setIsCartOpen }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error('useCart must be inside CartProvider');
  return ctx;
}

function StoreCreationForm({ onCreated }: { onCreated: () => void }) {
  const apiClient = useApiClient();
  const [name, setName] = useState('');
  const createStore = useMutation({
    mutationFn: (storeName: string) => apiClient.post('/stores', { name: storeName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-store'] });
      onCreated();
    },
  });

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-8">
      <div className="bg-white p-10 rounded-[32px] border border-[#F0EFE9] text-center shadow-sm max-w-md w-full">
        <h1 className="font-serif text-3xl text-[#333] mb-2">Create Your Store</h1>
        <p className="text-[#A5A58D] text-sm mb-8">Set up your storefront to start selling.</p>
        <form onSubmit={(e) => { e.preventDefault(); createStore.mutate(name); }}>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Store Name"
            className="w-full mb-6 p-3 rounded-xl border border-[#E5E5E1] bg-[#F7F6F2] outline-none focus:border-[#6B705C] transition-colors"
          />
          <button 
            type="submit" 
            disabled={createStore.isPending}
            className="w-full bg-[#6B705C] text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#5a5e4d] transition-colors disabled:opacity-50"
          >
            {createStore.isPending ? 'Creating...' : 'Create Store'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-store'],
    queryFn: () => apiClient.get('/admin/store'),
  });

  if (isLoading) return <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center">Loading admin...</div>;
  if (error) return <div className="min-h-screen bg-[#F7F6F2] flex items-center justify-center text-red-500">Error loading store info.</div>;

  if (data && !data.hasStore) {
    return <StoreCreationForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['admin-store'] })} />;
  }

  return <>{children}</>;
}

// --- Placeholders for Pages ---

export function CartDrawer({ storeId, themeColor }: { storeId?: string, themeColor: string }) {
  const { items, removeItem, updateQuantity, total, isCartOpen, setIsCartOpen } = useCart();
  
  const checkout = useCheckout(storeId);

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 transition-opacity" onClick={() => setIsCartOpen(false)}></div>
      <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-serif text-xl font-bold">Your Cart</h2>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-black">&times;</button>
        </div>
        <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center mt-10">Your cart is empty.</p>
          ) : items.map(item => (
            <div key={item.id} className="flex gap-4 items-center">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg"></div>
              )}
              <div className="flex-1">
                <h4 className="font-bold text-sm text-[#333]">{item.name}</h4>
                <p className="text-gray-500 text-sm mt-1">${item.price.toFixed(2)}</p>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 flex items-center justify-center border rounded-md text-gray-500 hover:bg-gray-50 transition-colors">-</button>
                  <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 flex items-center justify-center border rounded-md text-gray-500 hover:bg-gray-50 transition-colors">+</button>
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors self-start mt-2">
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>
          ))}
        </div>
        {items.length > 0 && (
          <div className="p-6 border-t bg-gray-50">
            <div className="flex justify-between mb-6 font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button 
              onClick={() => checkout.mutate()}
              disabled={checkout.isPending}
              style={{ backgroundColor: themeColor }}
              className="w-full text-white py-4 rounded-xl font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {checkout.isPending ? 'Processing...' : 'Checkout'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminLayout() { 
  const { user } = useUser();
  const location = useLocation();

  const navItemClass = (path: string) => {
    const isActive = location.pathname === path;
    return `px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-all cursor-pointer block ${isActive ? 'bg-[#6B705C] text-white' : 'text-[#6B705C] hover:bg-gray-50'}`;
  };

  return (
    <div className="flex min-h-screen bg-[#F7F6F2] font-sans text-[#333]">
      <aside className="w-[260px] bg-white border-r border-[#E5E5E1] py-10 px-6 flex flex-col shrink-0">
        <div className="mb-12">
          <h1 className="font-serif text-2xl font-bold text-[#6B705C]">Terra & Tide</h1>
          <p className="text-[10px] uppercase tracking-widest opacity-50 font-bold mt-1">Store Management v.1.0</p>
        </div>
        <nav className="flex-1 flex flex-col">
          <Link to="/admin" className={navItemClass('/admin')}>Dashboard</Link>
          <Link to="/admin/products" className={navItemClass('/admin/products')}>Products</Link>
          <Link to="/admin/coupons" className={navItemClass('/admin/coupons')}>Coupons</Link>
          <Link to="/admin/orders" className={navItemClass('/admin/orders')}>Orders</Link>
          <Link to="/admin/settings" className={navItemClass('/admin/settings')}>Store Settings</Link>
        </nav>
        <div className="mt-auto pt-6 border-t border-[#E5E5E1]">
          <div className="flex items-center gap-3">
            {clerkPubKey ? (
              <div className="flex items-center gap-3">
                <UserButton />
                <div>
                  <p className="text-sm font-bold">{user?.fullName || 'User'}</p>
                  <p className="text-[11px] opacity-60">Store Owner • {user?.id?.slice(0,8)}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#A5A58D]"></div>
                <div>
                  <p className="text-sm font-bold">Elena Moss</p>
                  <p className="text-[11px] opacity-60">Store Owner</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 px-10 flex items-center justify-between border-b border-[#E5E5E1] bg-white/30 shrink-0">
          <h2 className="font-serif text-xl">Dashboard Overview</h2>
          <div className="flex gap-4">
            <button className="px-4 py-2 bg-white border border-[#E5E5E1] rounded-full text-xs font-bold hover:bg-gray-50 transition-colors">Sync Catalog</button>
            <button className="px-6 py-2 bg-[#6B705C] text-white rounded-full text-xs font-bold shadow-lg shadow-[#6B705C]/20 hover:bg-[#5a5e4d] transition-colors">View Live Store</button>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}


export default function App() {
  const routerContent = (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          {/* Public Storefront */}
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/my-orders" element={<SignedIn><MyOrdersPage /></SignedIn>} />
          
          {/* Admin Panel */}
          <Route path="/admin" element={
            clerkPubKey ? (
              <>
                <SignedIn>
                  <AdminProtectedRoute>
                    <AdminLayout />
                  </AdminProtectedRoute>
                </SignedIn>
                <SignedOut><RedirectToSignIn /></SignedOut>
              </>
            ) : (
              <AdminLayout />
            )
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
      {clerkPubKey ? (
        <ClerkProvider publishableKey={clerkPubKey}>
          
            {routerContent}
          
        </ClerkProvider>
      ) : (
        routerContent
      )}
      <Toaster position="bottom-right" />
    </QueryClientProvider>
    </HelmetProvider>
  );
}
