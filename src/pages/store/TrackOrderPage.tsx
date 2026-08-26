import { StoreHeader } from '../../components/storefront/StoreHeader';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { Search, Package } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { useStoreConfig } from '../../hooks/useStoreConfig';

export function TrackOrderPage() {
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [shouldFetch, setShouldFetch] = useState(false);
  const apiClient = useApiClient();
  const { data: store } = useStoreConfig();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['track-order', email, orderId],
    queryFn: () => apiClient.get(`/orders/track?email=${encodeURIComponent(email)}&order_id=${encodeURIComponent(orderId)}`),
    enabled: shouldFetch,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && orderId) setShouldFetch(true);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pagado': return 'bg-emerald-100 text-emerald-800';
      case 'empacado': return 'bg-purple-100 text-purple-800';
      case 'enviado': return 'bg-blue-100 text-blue-800';
      case 'entregado': return 'bg-teal-100 text-teal-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      case 'pendiente':
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const themeColor = store?.config?.themeColor || '#6B705C';

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col font-sans">
      <SEO title="Rastrear Pedido" />
      <StoreHeader />
      
      <div className="flex-1 max-w-3xl mx-auto w-full p-4 sm:p-8 flex flex-col">
        <h1 className="font-serif text-3xl mb-8 text-[var(--color-text)]">Rastrea tu Pedido</h1>
        
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-[#E5E5E1] flex flex-col gap-4 mb-8">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">ID de Pedido</label>
            <input 
              type="text" 
              required
              value={orderId}
              onChange={(e) => { setOrderId(e.target.value); setShouldFetch(false); }}
              placeholder="e.g. 123e4567-..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setShouldFetch(false); }}
              placeholder="Your email address"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <button 
            type="submit"
            style={{ backgroundColor: themeColor }}
            className="mt-2 flex items-center justify-center gap-2 text-white px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            <Search size={18} /> Find Order
          </button>
        </form>

        {isLoading && <p className="text-center text-gray-500">Searching...</p>}
        {error && <p className="text-center text-red-500">Order not found or incorrect details.</p>}
        
        {order && (
          <div className="bg-white p-6 rounded-2xl border border-[#E5E5E1]">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold">Order #{order.id.split('-')[0]}</h2>
                <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(order.status)}`}>
                {order.status.replace('_', ' ')}
              </span>
            </div>

            {order.tracking_number && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm font-bold text-gray-700 mb-1">Tracking Number</p>
                <p className="font-mono text-gray-600">{order.tracking_number}</p>
              </div>
            )}

            <h3 className="font-bold text-sm uppercase tracking-widest text-gray-400 mb-4">Items</h3>
            <div className="space-y-4">
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="flex items-center gap-4">
                  {item.products?.images?.[0] ? (
                    <img src={item.products.images[0]} alt="" className="w-12 h-12 rounded object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400"><Package size={20}/></div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.products?.name || 'Product'}</p>
                    <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-sm">MXN ${(item.unit_price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>MXN ${Number(order.total).toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
