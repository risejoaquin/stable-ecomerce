/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Outlet, Link, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery, useMutation, QueryCache, MutationCache } from '@tanstack/react-query';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn, UserButton, useUser, useAuth } from '@clerk/clerk-react';
import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ProductsPage } from './pages/admin/ProductsPage';
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

function useCart() {
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

function CartDrawer({ storeId, themeColor }: { storeId?: string, themeColor: string }) {
  const { items, removeItem, updateQuantity, total, isCartOpen, setIsCartOpen } = useCart();
  
  const checkout = useMutation({
    mutationFn: async () => {
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          items: items.map(i => ({ productId: i.id, quantity: i.quantity }))
        })
      }).then(r => r.json());
      
      if (orderRes.error) throw new Error(orderRes.error);

      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: orderRes.id })
      }).then(r => r.json());

      if (checkoutRes.url) {
        window.location.href = checkoutRes.url;
      } else {
        throw new Error(checkoutRes.error || 'Checkout failed');
      }
    },
    onError: (err: any) => alert(err.message)
  });

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

function HomePage() { 
  const { data, isLoading } = useQuery({
    queryKey: ['public-store'],
    queryFn: () => fetch('/api/public/store').then(r => r.json())
  });
  
  const { items, setIsCartOpen, addItem } = useCart();

  if (isLoading) return <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">Loading...</div>;

  const store = data?.store || { name: 'Terra & Tide', config: { themeColor: '#6B705C' } };
  const products = data?.products || [];
  const themeColor = store.config?.themeColor || '#6B705C';
  const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#FDFCFB] font-sans text-[#333]" style={{ '--theme-color': themeColor } as React.CSSProperties}>
      <header className="h-20 px-8 max-w-7xl mx-auto flex items-center justify-between border-b border-[#F0EFE9]">
        <span className="font-serif italic text-2xl font-bold" style={{ color: themeColor }}>{store.name}</span>
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
        
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {products.map((p: any) => (
            <div key={p.id} className="bg-white border border-[#F0EFE9] rounded-3xl p-3 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="bg-gray-100 aspect-[3/4] rounded-2xl mb-4 overflow-hidden relative">
                {p.images?.[0] ? (
                   <img src={p.images[0]} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                   <div className="absolute inset-0 bg-[#B7B7A4]"></div>
                )}
              </div>
              <div className="px-2 pb-2 flex-1 flex flex-col">
                <h3 className="font-bold text-sm text-[#333]">{p.name}</h3>
                <p className="text-[#A5A58D] text-xs mt-1 mb-4">${(p.price || 0).toFixed(2)}</p>
                <div className="mt-auto">
                  <button 
                    onClick={() => addItem(p)}
                    style={{ color: themeColor }}
                    className="w-full bg-[#F7F6F2] font-bold text-xs py-2.5 rounded-xl hover:bg-[#E5E5E1] transition-colors border border-[#E5E5E1]"
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="col-span-full py-20 text-center text-[#A5A58D]">
              <p>No products available yet.</p>
            </div>
          )}
        </div>
      </div>
      <CartDrawer storeId={store?.id} themeColor={themeColor} />
    </div>
  );
}

function AdminDashboard() {
  const apiClient = useApiClient(); 
  const { data: storeData } = useQuery({
    queryKey: ['admin-store'],
    queryFn: () => apiClient.get('/admin/store')
  });

  const { data: products } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => apiClient.get('/admin/products')
  });

  const { data: orders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => apiClient.get('/admin/orders'),
    refetchInterval: 5000
  });

  const themeColor = storeData?.store?.config?.themeColor || '#6B705C';
  const previewProducts = products?.slice(0, 2) || [];
  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <div className="p-10 flex gap-8 flex-col lg:flex-row h-full">
      <div className="flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[24px] border border-[#E5E5E1]">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#A5A58D] mb-1">Net Revenue</p>
            <p className="text-2xl font-bold">$12,480.00</p>
            <p className="text-[11px] text-green-600 mt-2 font-medium">+14% from last month</p>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-[#E5E5E1]">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#A5A58D] mb-1">Pending Orders</p>
            <p className="text-2xl font-bold">14</p>
            <p className="text-[11px] text-orange-400 mt-2 font-medium">2 urgent shipments</p>
          </div>
          <div className="bg-white p-6 rounded-[24px] border border-[#E5E5E1]">
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#A5A58D] mb-1">Avg. Order Value</p>
            <p className="text-2xl font-bold">$89.50</p>
            <p className="text-[11px] text-green-600 mt-2 font-medium">+4.2% since launch</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[24px] border border-[#E5E5E1] flex-1">
          <h3 className="font-serif text-lg mb-6">Recent Orders</h3>
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase tracking-widest font-bold text-[#A5A58D] border-b border-[#F0EFE9]">
              <tr className="h-10">
                <th className="font-medium">Order ID</th>
                <th className="font-medium">Amount</th>
                <th className="font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {recentOrders.map((o: any) => (
                <tr key={o.id} className="h-14 border-b border-[#F0EFE9] last:border-0">
                  <td className="font-mono text-xs text-gray-500">#{o.id.split('-')[0]}</td>
                  <td className="text-gray-600">${(o.total || 0).toFixed(2)}</td>
                  <td>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${o.status === 'paid' ? 'bg-[#E6F5ED] text-[#2D6A4F]' : 'bg-[#FFF9E6] text-[#B08C00]'}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-8 text-[#A5A58D] text-sm">No orders yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Store Preview Frame */}
      <div className="flex flex-col items-center gap-6 shrink-0 lg:w-[320px]">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#A5A58D]">Storefront Preview</p>
        <div className="w-[320px] rounded-[48px] border-[8px] border-[#3F4238] h-[600px] shadow-[0_40px_80px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col" style={{ backgroundColor: themeColor }}>
          <div className="bg-[#FDFCFB] h-full w-full rounded-[36px] overflow-hidden flex flex-col">
            <header className="p-6 flex justify-between items-center shrink-0">
              <span className="font-serif italic text-lg font-bold">{storeData?.store?.name?.[0] || 'T'}&{storeData?.store?.name?.[1] || 'T'}</span>
              <div className="flex gap-2">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: themeColor }}></div>
                <div className="w-4 h-4 border rounded-full" style={{ borderColor: themeColor }}></div>
              </div>
            </header>
            <div className="px-6 flex-1 overflow-y-auto pb-6">
              <h4 className="font-serif text-2xl mb-4 text-[#333]">New Arrivals</h4>
              <div className="grid grid-cols-2 gap-3">
                {previewProducts.length > 0 ? previewProducts.map((p: any) => (
                  <div key={p.id} className="bg-white border border-[#F0EFE9] rounded-2xl p-2 shadow-sm">
                    <div className="aspect-[3/4] bg-gray-100 rounded-xl mb-2 overflow-hidden relative">
                      {p.images?.[0] ? (
                        <img src={p.images[0]} alt={p.name} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-[#B7B7A4]"></div>
                      )}
                    </div>
                    <p className="text-[10px] font-bold text-[#333] truncate">{p.name}</p>
                    <p className="text-[9px] opacity-60 mt-0.5">${(p.price || 0).toFixed(2)}</p>
                  </div>
                )) : (
                  <div className="col-span-2 text-center py-10 text-[#A5A58D] text-xs">No products yet.</div>
                )}
              </div>
              <div className="mt-6 p-4 rounded-2xl border" style={{ backgroundColor: `${themeColor}1A`, borderColor: `${themeColor}33` }}>
                <p className="font-serif italic text-xs mb-1" style={{ color: themeColor }}>"Craftsmanship is visible in every grain."</p>
                <p className="text-[8px] uppercase tracking-wider opacity-60" style={{ color: themeColor }}>Collection Spring '24</p>
              </div>
            </div>
            <footer className="h-16 bg-white border-t border-[#F0EFE9] px-8 flex items-center justify-between shrink-0">
              <div className="w-6 h-6 rounded-md" style={{ backgroundColor: themeColor }}></div>
              <div className="w-6 h-6 border border-[#E5E5E1] rounded-md"></div>
              <div className="w-6 h-6 border border-[#E5E5E1] rounded-md"></div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminSettingsPage() {
  const apiClient = useApiClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-store'],
    queryFn: () => apiClient.get('/admin/store'),
  });

  const updateConfig = useMutation({
    mutationFn: (config: StoreConfig) => apiClient.put('/admin/store/config', config),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-store'] })
  });

  const [themeColor, setThemeColor] = useState('#6B705C');

  useEffect(() => { if (data?.store?.config?.themeColor) setThemeColor(data.store.config.themeColor); }, [data]);

  if (isLoading) return <div className="p-10">Loading settings...</div>;

  return (
    <div className="p-10 flex flex-col gap-6 h-full max-w-3xl">
      <h2 className="font-serif text-2xl text-[#333]">Store Settings</h2>
      <div className="bg-white rounded-[24px] border border-[#E5E5E1] p-8">
        <h3 className="font-medium mb-6">Appearance</h3>
        <div className="mb-6">
          <label className="block text-sm font-bold text-[#6B705C] mb-2">Theme Color</label>
          <div className="flex gap-4 items-center">
            <input 
              type="color" 
              value={themeColor} 
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-12 h-12 rounded cursor-pointer border border-[#E5E5E1] p-1" 
            />
            <span className="text-sm text-gray-500 font-mono">{themeColor}</span>
          </div>
        </div>
        <button 
          onClick={() => updateConfig.mutate({ themeColor, fontFamily: data?.store?.config?.fontFamily || 'sans-serif' })}
          disabled={updateConfig.isPending}
          className="bg-[#6B705C] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#5a5e4d] transition-colors disabled:opacity-50"
        >
          {updateConfig.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function AdminOrdersPage() {
  const apiClient = useApiClient();
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => apiClient.get('/admin/orders'),
    refetchInterval: 5000
  });

  return (
    <div className="p-10 flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-[#333]">Orders</h2>
      </div>
      <div className="bg-white rounded-[24px] border border-[#E5E5E1] flex-1 p-6 overflow-auto">
        {isLoading ? <p>Loading...</p> : (
          <table className="w-full text-left">
            <thead className="text-[10px] uppercase tracking-widest font-bold text-[#A5A58D] border-b border-[#F0EFE9]">
              <tr className="h-10">
                <th className="font-medium">Order ID</th>
                <th className="font-medium">Date</th>
                <th className="font-medium">Amount</th>
                <th className="font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(orders || []).map((o: any) => (
                <tr key={o.id} className="h-14 border-b border-[#F0EFE9] last:border-0">
                  <td className="font-mono text-xs text-gray-500">#{o.id.split('-')[0]}</td>
                  <td className="text-gray-600">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="text-gray-600">${(o.total || 0).toFixed(2)}</td>
                  <td>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${o.status === 'paid' ? 'bg-[#E6F5ED] text-[#2D6A4F]' : 'bg-[#FFF9E6] text-[#B08C00]'}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
              {orders?.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#A5A58D] text-sm">No orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
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

function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, [clearCart]);

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center font-sans text-[#333]">
      <div className="w-16 h-16 bg-[#E6F5ED] text-[#2D6A4F] rounded-full flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-3xl">check</span>
      </div>
      <h1 className="font-serif text-3xl mb-2">Thank you for your order!</h1>
      <p className="text-[#A5A58D] mb-8">We've received your payment and will begin processing your order.</p>
      <Link to="/" className="bg-[#6B705C] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#5a5e4d] transition-colors">
        Continue Shopping
      </Link>
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
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          
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
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );

  return (
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
  );
}
