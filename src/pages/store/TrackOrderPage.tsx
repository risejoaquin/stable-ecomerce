import { StoreHeader } from '../../components/storefront/StoreHeader';
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { CheckCircle2, Clock, Mail, Package, Search, Truck } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { useLocation } from 'react-router-dom';
import { useStoreConfig } from '../../hooks/useStoreConfig';

const steps = ['pendiente', 'pagado', 'empacado', 'enviado', 'entregado'];
const labels: Record<string, string> = {
  pendiente: 'Pendiente', pagado: 'Pagado', empacado: 'Empacado', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado', refunded: 'Reembolsado', partially_refunded: 'Reembolso parcial'
};

export function TrackOrderPage() {
  const location = useLocation();
  const initialOrderId = useMemo(() => new URLSearchParams(location.search).get('order_id') || '', [location.search]);
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState(initialOrderId);
  const [shouldFetch, setShouldFetch] = useState(false);
  const apiClient = useApiClient();
  const { data: store } = useStoreConfig();

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['track-order', email, orderId],
    queryFn: () => apiClient.get(`/orders/track?email=${encodeURIComponent(email)}&order_id=${encodeURIComponent(orderId)}`),
    enabled: shouldFetch,
    retry: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && orderId.trim()) setShouldFetch(true);
  };

  const themeColor = store?.config?.themeColor || '#6B705C';
  const currentStepIndex = Math.max(0, steps.indexOf(order?.status));
  const isTerminal = ['cancelado', 'refunded'].includes(order?.status);

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col font-sans">
      <SEO title="Rastrear pedido | Selfcare Sinners" description="Consulta el estado, timeline y tracking de tu pedido Selfcare Sinners." />
      <StoreHeader />
      <div className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 flex flex-col">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-xs font-black uppercase tracking-[0.25em] opacity-50 mb-3">Selfcare Sinners</p>
          <h1 className="font-serif text-4xl sm:text-5xl mb-3 text-[var(--color-text)]">Rastrea tu pedido</h1>
          <p className="opacity-65">Ingresa el ID de orden y el correo usado en checkout. No necesitas cuenta para consultar una compra como invitado.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-3xl border border-[#E5E5E1] grid md:grid-cols-[1fr_1fr_auto] gap-4 mb-8">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">ID de pedido</label>
            <input type="text" required value={orderId} onChange={(e) => { setOrderId(e.target.value); setShouldFetch(false); }} placeholder="a8b5eb07-f71d-..." className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">Correo</label>
            <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setShouldFetch(false); }} placeholder="tu@email.com" className="w-full border border-gray-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
          <button type="submit" style={{ backgroundColor: themeColor }} className="md:self-end flex items-center justify-center gap-2 text-white px-6 py-3 rounded-2xl font-black hover:opacity-90 transition-opacity">
            <Search size={18} /> Buscar
          </button>
        </form>

        {isLoading && <p className="text-center text-gray-500">Buscando pedido...</p>}
        {error && <div className="text-center bg-white border border-red-100 text-red-600 rounded-3xl p-8">No encontramos el pedido con esos datos. Revisa el ID y el correo usado al pagar.</div>}

        {order && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <section className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E5E1]">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
                <div>
                  <p className="text-xs uppercase tracking-widest opacity-50 font-black">Pedido</p>
                  <h2 className="text-2xl font-black">#{order.id.split('-')[0]}</h2>
                  <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <span className="px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider bg-gray-100" style={{ color: themeColor }}>{labels[order.status] || order.status}</span>
              </div>

              {!isTerminal && (
                <div className="mb-8">
                  <div className="grid grid-cols-5 gap-2">
                    {steps.map((step, idx) => {
                      const done = idx <= currentStepIndex;
                      return <div key={step} className="text-center">
                        <div className="h-2 rounded-full mb-2" style={{ backgroundColor: done ? themeColor : '#E5E5E1' }} />
                        <p className="text-[10px] sm:text-xs font-bold opacity-70">{labels[step]}</p>
                      </div>;
                    })}
                  </div>
                </div>
              )}

              {order.tracking_number ? (
                <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <p className="text-sm font-black text-gray-700 mb-1 flex items-center gap-2"><Truck size={16} /> Tracking</p>
                  <p className="font-mono text-gray-700">{order.tracking_number}</p>
                  {order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer" className="text-sm underline" style={{ color: themeColor }}>Abrir rastreo externo</a>}
                </div>
              ) : <div className="mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-sm opacity-70">El tracking aparecerá aquí cuando tu pedido sea enviado.</div>}

              <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-4">Productos</h3>
              <div className="space-y-4">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4">
                    {item.products?.images?.[0] ? <img src={item.products.images[0]} alt="" className="w-14 h-14 rounded-2xl object-cover border" /> : <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400"><Package size={20}/></div>}
                    <div className="flex-1">
                      <p className="font-bold text-sm">{item.products?.name || item.product_snapshot?.name || 'Producto'}</p>
                      <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                    </div>
                    <p className="font-bold text-sm">MXN ${(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between font-black text-lg">
                <span>Total</span>
                <span>MXN ${Number(order.total).toFixed(2)}</span>
              </div>
            </section>

            <aside className="bg-white p-5 sm:p-7 rounded-3xl border border-[#E5E5E1] h-fit">
              <h3 className="font-black text-xl mb-5">Timeline</h3>
              <div className="space-y-4">
                {(order.timeline || []).length === 0 && <p className="text-sm opacity-60">Todavía no hay eventos operativos.</p>}
                {(order.timeline || []).map((event: any) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="mt-1">{event.event_type === 'status_changed' ? <CheckCircle2 size={18} color={themeColor} /> : <Clock size={18} className="text-gray-400" />}</div>
                    <div>
                      <p className="font-bold text-sm">{event.event_type === 'status_changed' ? `${labels[event.from_status] || event.from_status || 'Inicio'} → ${labels[event.to_status] || event.to_status}` : labels[event.to_status] || event.event_type}</p>
                      <p className="text-xs opacity-55">{new Date(event.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-4 rounded-2xl bg-gray-50 text-sm opacity-75 flex gap-2"><Mail size={18} /> Si tienes dudas, contáctanos con tu ID de pedido.</div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
