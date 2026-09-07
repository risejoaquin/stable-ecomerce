import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Package, Search, ShoppingBag, Truck } from 'lucide-react';
import { SEO } from '../../components/SEO';
import { useApiClient } from '../../api/useApiClient';
import { UixPageShell } from '../../components/uix/UixPageShell';
import { UixStatePanel } from '../../components/uix/UixStatePanel';
import { UixStatusBadge } from '../../components/uix/UixStatusBadge';
import { toast } from 'react-hot-toast';

export function MyOrdersPage() {
  const apiClient = useApiClient();

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => apiClient.get('/orders/my'),
  });

  const resumeCheckout = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await apiClient.post('/checkout', { orderId });
      return res.url;
    },
    onSuccess: (url) => {
      if (!url || typeof url !== 'string') {
        toast.error('No pudimos abrir el pago seguro. Intenta de nuevo.');
        return;
      }
      window.location.href = url;
    },
    onError: () => toast.error('No pudimos reanudar el pago. Intenta de nuevo.')
  });

  return (
    <UixPageShell mainClassName="uix-customer-page" data-mobile-ux-e="orders-checkout-flow">
      <SEO title="Mis pedidos | Selfcare Sinners" />
      <section className="uix-customer-hero" data-uix-system-c="orders-hero">
        <div>
          <p className="uix-eyebrow">Centro de cuenta</p>
          <h1>Mis pedidos</h1>
          <p>Consulta compras, tracking, pagos pendientes y el historial de productos que forman parte de tu ritual.</p>
        </div>
        <Link to="/track" className="uix-action-secondary"><Truck size={16} /> Rastrear pedido</Link>
      </section>

      {isLoading && <UixStatePanel tone="loading" title="Cargando tus pedidos" description="Estamos preparando tu historial de compras." />}
      {error && <UixStatePanel tone="error" title="No pudimos cargar tus pedidos" description="Intenta de nuevo o contacta soporte si el problema continúa." actionText="Ir a soporte" actionTo="/contact" />}
      {!isLoading && !error && (!orders || orders.length === 0) && (
        <UixStatePanel tone="empty" title="Todavía no tienes pedidos" description="Explora el catálogo y empieza tu primera rutina Selfcare Sinners." actionText="Seguir comprando" actionTo="/" />
      )}

      {!isLoading && !error && orders?.length > 0 && (
        <section className="uix-order-stack" data-uix-system-c="orders-list">
          {orders.map((order: any) => (
            <article key={order.id} className="uix-order-card">
              <header className="uix-order-card__header">
                <div>
                  <p className="uix-eyebrow">Pedido #{String(order.id).split('-')[0]}</p>
                  <h2>{new Date(order.created_at).toLocaleDateString()}</h2>
                  <span>{order.order_items?.length || 0} producto{(order.order_items?.length || 0) === 1 ? '' : 's'}</span>
                </div>
                <UixStatusBadge status={order.status} />
              </header>

              {order.tracking_number && (
                <div className="uix-order-card__tracking">
                  <Truck size={17} />
                  <div>
                    <strong>Tracking</strong>
                    <span>{order.tracking_number}</span>
                  </div>
                </div>
              )}

              <div className="uix-order-card__items">
                {order.order_items?.map((item: any) => (
                  <div key={item.id} className="uix-order-line">
                    {item.products?.images?.[0] ? (
                      <img src={item.products.images[0]} alt={item.products?.name || 'Producto'} loading="lazy" />
                    ) : (
                      <div className="uix-order-line__placeholder"><Package size={18} /></div>
                    )}
                    <div>
                      <strong>{item.products?.name || item.product_snapshot?.name || 'Producto'}</strong>
                      <span>Cantidad: {item.quantity}</span>
                    </div>
                    <strong>MXN ${(Number(item.unit_price) * Number(item.quantity)).toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              <footer className="uix-order-card__footer">
                {order.status === 'pendiente' ? (
                  <button
                    type="button"
                    onClick={() => resumeCheckout.mutate(order.id)}
                    disabled={resumeCheckout.isPending && resumeCheckout.variables === order.id}
                    className="uix-action-primary"
                  >
                    <ShoppingBag size={16} /> {resumeCheckout.isPending && resumeCheckout.variables === order.id ? 'Procesando...' : 'Completar pago'}
                  </button>
                ) : (
                  <Link to={`/track?order_id=${order.id}`} className="uix-action-secondary"><Search size={16} /> Rastrear</Link>
                )}
                <div className="uix-order-total"><span>Total</span><strong>MXN ${Number(order.total).toFixed(2)}</strong></div>
              </footer>
            </article>
          ))}
        </section>
      )}
    </UixPageShell>
  );
}
