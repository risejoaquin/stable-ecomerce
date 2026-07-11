import { StoreHeader } from '../../components/storefront/StoreHeader';
import { EmptyState } from '../../components/EmptyState';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { SEO } from '../../components/SEO';
import { useStoreConfig } from '../../hooks/useStoreConfig';
import { Package } from 'lucide-react';

export function MyOrdersPage() {
  const apiClient = useApiClient();
  const { data: store } = useStoreConfig();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => apiClient.get('/orders/my'),
  });

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'paid': return 'bg-emerald-100 text-emerald-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'refunded': 
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const themeColor = store?.config?.themeColor || '#6B705C';

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col font-sans">
      <SEO title="My Orders" />
      <StoreHeader />
      
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 flex flex-col">
        <h1 className="font-serif text-3xl mb-8 text-[#333]">My Orders</h1>
        
        {isLoading ? <p className="text-gray-500">Loading your orders...</p> : (
          orders?.length === 0 ? (
            <div className="text-center py-20">
              <Package size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">You haven't placed any orders yet.</p>
              <a href="/" className="mt-4 inline-block text-[#6B705C] hover:underline font-medium">Continue Shopping</a>
            </div>
          ) : (
            <div className="grid gap-6">
              {orders?.map((order: any) => (
                <div key={order.id} className="bg-white p-6 rounded-2xl border border-[#E5E5E1]">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 pb-4 border-b border-gray-100">
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
                        <p className="font-medium text-sm">${(item.unit_price * item.quantity).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-6 font-bold text-lg">
                    <span className="text-gray-500">Total</span>
                    <span>${Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
