import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Mail, Package, Search, Truck } from 'lucide-react';
import { useApiClient } from '../../api/useApiClient';
import { SEO } from '../../components/SEO';
import { UixPageShell } from '../../components/uix/UixPageShell';
import { UixStatePanel } from '../../components/uix/UixStatePanel';
import { UixStatusBadge } from '../../components/uix/UixStatusBadge';

const steps = ['pendiente', 'pagado', 'empacado', 'enviado', 'entregado'];
const labels: Record<string, string> = {
  pendiente: 'Pendiente', pagado: 'Pagado', empacado: 'Empacado', enviado: 'Enviado', entregado: 'Entregado', cancelado: 'Cancelado', refunded: 'Reembolsado', partially_refunded: 'Reembolso parcial'
};

export function TrackOrderPage() {
  const location = useLocation();
  const initialOrderId = useMemo(() => new URLSearchParams(location.search).get('order_id') || '', [location.search]);
  const [email, setEmail] = useState(() => typeof window !== 'undefined' ? localStorage.getItem('guest_email') || '' : '');
  const [orderId, setOrderId] = useState(initialOrderId);
  const [shouldFetch, setShouldFetch] = useState(false);
  const apiClient = useApiClient();

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

  const currentStepIndex = Math.max(0, steps.indexOf(order?.status));
  const isTerminal = ['cancelado', 'refunded'].includes(order?.status);

  return (
    <UixPageShell mainClassName="uix-customer-page" data-mobile-ux-c="track-order-premium" data-mobile-ux-e="order-flow-qa">
      <SEO title="Rastrear pedido | Selfcare Sinners" description="Consulta el estado, timeline y tracking de tu pedido Selfcare Sinners." />

      <section className="uix-customer-hero uix-track-hero">
        <div>
          <p className="uix-eyebrow">Seguimiento de compra</p>
          <h1>Rastrea tu pedido</h1>
          <p>Ingresa el ID del pedido y el correo usado durante checkout. También puedes consultar compras realizadas como invitado.</p>
        </div>
        <Truck size={30} aria-hidden="true" />
      </section>

      <form onSubmit={handleSubmit} className="uix-track-form" aria-label="Buscar pedido">
        <label><span>ID de pedido</span><input type="text" required value={orderId} onChange={(e) => { setOrderId(e.target.value); setShouldFetch(false); }} placeholder="a8b5eb07-f71d-..." autoComplete="off" /></label>
        <label><span>Correo electrónico</span><input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setShouldFetch(false); }} placeholder="tu@email.com" autoComplete="email" /></label>
        <button type="submit" className="uix-action-primary"><Search size={18} /> Buscar pedido</button>
      </form>

      {isLoading && <UixStatePanel tone="loading" title="Buscando tu pedido" description="Estamos consultando el estado más reciente de tu compra." />}
      {error && <UixStatePanel tone="error" title="No encontramos ese pedido" description="Revisa el ID y el correo usados durante la compra e inténtalo nuevamente." actionText="Contactar soporte" actionTo="/contact" />}

      {order && (
        <div className="uix-track-layout">
          <section className="uix-track-card">
            <header className="uix-track-card__header">
              <div><p className="uix-eyebrow">Pedido</p><h2>#{String(order.id).split('-')[0]}</h2><span>{new Date(order.created_at).toLocaleString()}</span></div>
              <UixStatusBadge status={order.status} />
            </header>

            {!isTerminal && (
              <div className="uix-track-progress" aria-label="Progreso del pedido">
                {steps.map((step, idx) => <div key={step} className={idx <= currentStepIndex ? 'is-active' : ''}><span /><strong>{labels[step]}</strong></div>)}
              </div>
            )}

            {order.tracking_number ? (
              <div className="uix-track-tracking"><Truck size={18} /><div><strong>Número de rastreo</strong><span>{order.tracking_number}</span>{order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noreferrer">Abrir rastreo externo</a>}</div></div>
            ) : <div className="uix-track-note">El número de rastreo aparecerá aquí cuando el pedido haya sido enviado.</div>}

            <div className="uix-track-items">
              <h3>Productos</h3>
              {order.order_items?.map((item: any) => (
                <div key={item.id} className="uix-order-line">
                  {item.products?.images?.[0] ? <img src={item.products.images[0]} alt={item.products?.name || 'Producto'} loading="lazy" /> : <div className="uix-order-line__placeholder"><Package size={20}/></div>}
                  <div><strong>{item.products?.name || item.product_snapshot?.name || 'Producto'}</strong><span>Cantidad: {item.quantity}</span></div>
                  <strong>MXN ${(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}</strong>
                </div>
              ))}
            </div>
            <footer className="uix-track-total"><span>Total</span><strong>MXN ${Number(order.total).toFixed(2)}</strong></footer>
          </section>

          <aside className="uix-track-card uix-track-timeline">
            <h2>Timeline</h2>
            {(order.timeline || []).length === 0 && <p className="uix-muted-copy">Todavía no hay eventos operativos.</p>}
            {(order.timeline || []).map((event: any) => (
              <div key={event.id} className="uix-track-event">
                <div>{event.event_type === 'status_changed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}</div>
                <div><strong>{event.event_type === 'status_changed' ? `${labels[event.from_status] || event.from_status || 'Inicio'} → ${labels[event.to_status] || event.to_status}` : labels[event.to_status] || event.event_type}</strong><span>{new Date(event.created_at).toLocaleString()}</span></div>
              </div>
            ))}
            <div className="uix-track-support"><Mail size={18} /><span>Si tienes dudas, contáctanos incluyendo tu ID de pedido.</span></div>
          </aside>
        </div>
      )}
    </UixPageShell>
  );
}
