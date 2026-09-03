import { SignIn, SignUp } from './components/AuthMock';

import { PrivacyPolicyPage } from './pages/legal/PrivacyPolicyPage';
import { TermsAndConditionsPage } from './pages/legal/TermsAndConditionsPage';
import { ReturnPolicyPage } from './pages/legal/ReturnPolicyPage';
import { ContactPage } from './pages/legal/ContactPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { CookieConsent } from './components/CookieConsent';
import { useAuthSafe as useAuth } from './hooks/useAuthSafe';
import { RecoverCartPage } from './pages/store/RecoverCartPage';
import { VerifyEmailPage } from './pages/store/VerifyEmailPage';
import { WishlistPage } from './pages/store/WishlistPage';
import { ThemeProvider } from './components/ThemeProvider';
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
import { SignedIn, SignedOut, RedirectToSignIn, UserButton, AuthModalProvider } from './components/AuthMock';
import { useUserSafe as useUser } from './hooks/useUserSafe';
import React, { useEffect, useState, Component, ErrorInfo, ReactNode } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { ProductsPage } from './pages/admin/ProductsPage';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage';
import { AdminCustomersPage } from './pages/admin/AdminCustomersPage';
import { AdminCommercialPage } from './pages/admin/AdminCommercialPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminEmailCenterPage } from './pages/admin/AdminEmailCenterPage';
import { HomePage } from './pages/store/HomePage';
import { ProfilePage } from './pages/store/ProfilePage';
import { TrackOrderPage } from './pages/store/TrackOrderPage';
import { MyOrdersPage } from './pages/store/MyOrdersPage';
import { CheckoutSuccessPage } from './pages/store/CheckoutSuccessPage';
import { ResetPasswordPage } from './pages/store/ResetPasswordPage';
import { FaqPage } from './pages/store/FaqPage';
import { useCheckout } from './hooks/useCheckout';
import { useApiClient } from './api/useApiClient';
import type { Product, StoreConfig } from './types';
import { CheckoutConfidenceStrip } from './components/conversion/CheckoutConfidenceStrip';
import { ConversionMicrocopy } from './components/conversion/ConversionMicrocopy';
import { trackMarketingEvent } from './lib/analytics';
import { AdminCommandNav } from './components/admin/uix/AdminCommandNav';

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error: any) => toast.error(error.message || 'Something went wrong'),
    onSuccess: () => toast.success('Action successful')
  }),
  queryCache: new QueryCache({
    onError: (error: any) => toast.error(error.message || 'Failed to fetch data')
  })
});
type CartItem = {
  id: string;
  productId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
  sku?: string;
};

type CartContextType = {
  items: CartItem[];
  addItem: (product: any) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  setItems: (items: CartItem[]) => void;
  total: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
};

const CartContext = React.createContext<CartContextType | null>(null);

function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  const addItem = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1, image: i.image || product.image || product.images?.[0] } : i);
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, image: product.image || product.images?.[0] }];
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
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, setItems, total, isCartOpen, setIsCartOpen }}>
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
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-8">
      <div className="bg-white p-10 rounded-[32px] border border-[#F0EFE9] text-center shadow-sm max-w-md w-full">
        <h1 className="font-serif text-3xl text-[var(--color-text)] mb-2">Crea tu Tienda</h1>
        <p className="text-[var(--color-secondary)] text-sm mb-8">Configura tu tienda para empezar a vender.</p>
        <form onSubmit={(e) => { e.preventDefault(); createStore.mutate(name); }}>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre de la Tienda"
            className="w-full mb-6 p-3 rounded-xl border border-[#E5E5E1] bg-[var(--color-background)] outline-none focus:border-[var(--color-primary)] transition-colors"
          />
          <button 
            type="submit" 
            disabled={createStore.isPending}
            className="w-full bg-[var(--color-primary)] text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-[#5a5e4d] transition-colors disabled:opacity-50"
          >
            {createStore.isPending ? 'Creating...' : 'Crear Tienda'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const apiClient = useApiClient();
  const { role } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-store'],
    queryFn: () => apiClient.get('/admin/store'),
    enabled: role === 'admin'
  });

  if (role !== 'admin') {
    return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center text-red-500">Acceso Denegado. Solo administradores.</div>;
  }

  if (isLoading) return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">Cargando administración...</div>;
  if (error) return <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center text-red-500">Error al cargar la información de la tienda.</div>;

  if (data && !data.hasStore) {
    return <StoreCreationForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['admin-store'] })} />;
  }

  return <>{children}</>;
}

// --- Placeholders for Pages ---

export function CartDrawer({ storeId, themeColor, buttonColor }: { storeId?: string, themeColor: string, buttonColor?: string }) {
  const { items, removeItem, updateQuantity, total, isCartOpen, setIsCartOpen } = useCart();
  const { isSignedIn } = useAuth();
  const [couponCode, setCouponCode] = React.useState('');
  const [guestEmail, setGuestEmail] = React.useState(() => localStorage.getItem('guest_email') || '');
  const [appliedCoupon, setAppliedCoupon] = React.useState<any | null>(null);
  const [couponError, setCouponError] = React.useState('');
  const checkout = useCheckout(storeId);

  if (!isCartOpen) return null;

  let currentDiscount = 0;
  let isCouponActive = false;
  if (appliedCoupon) {
    if (!appliedCoupon.min_order_amount || total >= appliedCoupon.min_order_amount) {
      isCouponActive = true;
      currentDiscount = appliedCoupon.discount_type === 'percentage' ? (total * appliedCoupon.discount_value) / 100 : appliedCoupon.discount_value;
    }
  }
  const finalTotal = Math.max(0, total - currentDiscount);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const validateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), storeId, orderTotal: total })
      });
      const data = await res.json();
      if (data.error) {
        setCouponError(data.error);
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon(data.coupon);
        setCouponCode(data.coupon.code);
        trackMarketingEvent('coupon_applied', { code: data.coupon.code, discount_type: data.coupon.discount_type, discount_value: data.coupon.discount_value }, { source: 'cart' });
      }
    } catch (e) {
      setCouponError('No pudimos validar el cupón. Intenta de nuevo.');
    }
  };

  const startCheckout = () => {
    if (!isSignedIn) {
      const email = guestEmail.trim();
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
        setCouponError('Ingresa un correo válido para continuar como invitado.');
        return;
      }
      localStorage.setItem('guest_email', email);
      trackMarketingEvent('checkout_started', { itemCount, total, finalTotal, couponCode: isCouponActive ? appliedCoupon?.code : undefined, guest: true }, { source: 'cart' });
      fetch('/api/cart/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, items })
      }).finally(() => checkout.mutate({ couponCode: isCouponActive ? appliedCoupon?.code : undefined }));
      return;
    }
    trackMarketingEvent('checkout_started', { itemCount, total, finalTotal, couponCode: isCouponActive ? appliedCoupon?.code : undefined, guest: false }, { source: 'cart' });
    checkout.mutate({ couponCode: isCouponActive ? appliedCoupon?.code : undefined });
  };

  return (
    <div className="premium-cart-overlay">
      <div className="premium-cart-scrim" onClick={() => setIsCartOpen(false)}></div>
      <aside className="premium-cart-drawer animate-in slide-in-from-right duration-300">
        <header className="premium-cart-header">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] opacity-50 font-black">Selfcare Sinners</p>
            <h2 className="font-serif text-2xl font-black">Tu carrito</h2>
            <p className="text-sm opacity-60">{itemCount} artículo{itemCount === 1 ? '' : 's'} listo{itemCount === 1 ? '' : 's'} para checkout seguro.</p>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="text-gray-500 hover:text-black text-2xl leading-none">&times;</button>
        </header>

        <div className="premium-cart-body">
          {items.length === 0 ? (
            <div className="text-center my-auto py-12">
              <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4 flex items-center justify-center"><span className="material-symbols-outlined">shopping_bag</span></div>
              <h3 className="font-black text-lg mb-2">Tu carrito está vacío.</h3>
              <p className="text-gray-500 text-sm mb-6">Explora el catálogo y arma tu rutina.</p>
              <button onClick={() => setIsCartOpen(false)} className="px-5 py-3 rounded-2xl text-white font-bold" style={{ backgroundColor: buttonColor || themeColor }}>Seguir comprando</button>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="premium-cart-item">
              {item.image ? <img src={item.image} alt={item.name} loading="lazy" /> : <div className="premium-cart-image-placeholder"></div>}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-[var(--color-text)] line-clamp-2">{item.name}</h4>
                <p className="text-gray-500 text-sm mt-1">MXN ${Number(item.price).toFixed(2)}</p>
                <div className="flex items-center gap-3 mt-3">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="premium-qty-control">-</button>
                  <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="premium-qty-control">+</button>
                </div>
              </div>
              <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors self-start mt-2"><span className="material-symbols-outlined text-xl">delete</span></button>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <footer className="premium-cart-footer flex flex-col gap-4">
            {!isSignedIn && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Correo para checkout invitado</label>
                <input type="email" placeholder="tu@email.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="premium-field text-sm" />
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" placeholder="Código promocional" value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} className="premium-field flex-1 text-sm" id="coupon-input" />
              <button onClick={validateCoupon} className="px-4 py-3 bg-gray-200 text-gray-800 rounded-2xl text-sm font-black hover:bg-gray-300 transition-colors">Aplicar</button>
            </div>
            {couponError && <p className="text-sm text-red-600">{couponError}</p>}
            {isCouponActive && appliedCoupon && <p className="text-sm text-green-700 font-bold">Cupón {appliedCoupon.code} aplicado.</p>}
            <div className="flex flex-col gap-2 border-b border-gray-200 pb-4 text-sm">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>MXN ${total.toFixed(2)}</span></div>
              {isCouponActive && appliedCoupon && <div className="flex justify-between text-green-600 font-bold"><span>Descuento ({appliedCoupon.code})</span><span>-MXN ${currentDiscount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-gray-500"><span>Pago</span><span>Stripe Checkout seguro</span></div>
            </div>
            <div className="flex justify-between font-black text-xl"><span>Total</span><span>MXN ${finalTotal.toFixed(2)}</span></div>
            <CheckoutConfidenceStrip />
            <button onClick={startCheckout} disabled={checkout.isPending} style={{ backgroundColor: buttonColor || themeColor }} className="premium-primary-action mt-2">
              {checkout.isPending ? 'Procesando...' : 'Continuar a pago seguro'}
            </button>
            <ConversionMicrocopy type="checkout" />
          </footer>
        )}
      </aside>
    </div>
  );
}

function AdminLayout() { 
  const { user } = useUser();

  return (
    <div className="uix-admin-shell">
      <AdminCommandNav />
      <main className="uix-admin-main">
        <header className="uix-admin-topbar">
          <div>
            <p className="uix-admin-eyebrow">Panel organizado</p>
            <h2>Selfcare Sinners Admin</h2>
            <span>{user?.fullName || 'Administrador'} · Operations console</span>
          </div>
          <div className="uix-admin-topbar__actions">
            <button
              onClick={() => {
                toast.promise(queryClient.invalidateQueries(), {
                  loading: 'Sincronizando datos...',
                  success: 'Datos actualizados.',
                  error: 'No se pudieron actualizar los datos'
                });
              }}
              className="uix-admin-secondary-action"
            >
              Sincronizar
            </button>
            <button onClick={() => window.open('/', '_blank')} className="uix-admin-primary-action">
              Ver tienda
            </button>
          </div>
        </header>
        <div className="uix-admin-content">
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
          <Route path="/recover" element={<RecoverCartPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsAndConditionsPage />} />
          <Route path="/returns" element={<ReturnPolicyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/sign-in/*" element={<SignIn />} />
          <Route path="/sign-up/*" element={<SignUp />} />
          <Route path="*" element={<NotFoundPage />} />
  
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/product/:id/:slug" element={<ProductDetailPage />} />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/track" element={<TrackOrderPage />} />
          <Route path="/my-orders" element={<SignedIn><MyOrdersPage /></SignedIn>} />
          <Route path="/profile" element={<SignedIn><ProfilePage /></SignedIn>} />
          <Route path="/wishlist" element={<SignedIn><WishlistPage /></SignedIn>} />
          
          {/* Admin Panel */}
          <Route path="/admin" element={
            <>
              <SignedIn>
                <AdminProtectedRoute>
                  <AdminLayout />
                </AdminProtectedRoute>
              </SignedIn>
              <SignedOut><RedirectToSignIn /></SignedOut>
            </>
          }>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="categories" element={<AdminCategoriesPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="orders" element={<AdminOrdersPage />} />
            <Route path="customers" element={<AdminCustomersPage />} />
            <Route path="commercial" element={<AdminCommercialPage />} />
            <Route path="email" element={<AdminEmailCenterPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Routes>
      </CartProvider>
      <CookieConsent />
    </BrowserRouter>
  );

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          {routerContent}
          <Toaster position="bottom-right" />
          <AuthModalProvider>{null}</AuthModalProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
