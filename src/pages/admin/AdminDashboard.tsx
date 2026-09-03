import React from 'react';
import { Activity, AlertTriangle, DollarSign, Package, ShoppingCart, ShieldCheck, Tag, TrendingUp, Users, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAdminSales, useCouponsAnalytics, useOperationsSummary, useRecentOrders, useTopProducts } from '../../hooks/useAnalytics';
import { AdminCommandAlert } from '../../components/admin/uix/AdminCommandAlert';
import { AdminCommandList, AdminCommandListRow } from '../../components/admin/uix/AdminCommandList';
import { AdminCommandMetric } from '../../components/admin/uix/AdminCommandMetric';
import { AdminCommandPanel } from '../../components/admin/uix/AdminCommandPanel';
import { AdminCommandSection } from '../../components/admin/uix/AdminCommandSection';

const formatCurrency = (value: number | string | null | undefined) => `MXN $${Number(value || 0).toFixed(2)}`;
const formatStatus = (value?: string) => String(value || 'pendiente').replace(/_/g, ' ');
const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX');
};

export function AdminDashboard() {
  const { data: sales, isLoading: isSalesLoading } = useAdminSales();
  const { data: topProducts, isLoading: isProductsLoading } = useTopProducts();
  const { data: recentOrders, isLoading: isOrdersLoading } = useRecentOrders();
  const { data: coupons, isLoading: isCouponsLoading } = useCouponsAnalytics();
  const { data: operations, isLoading: isOperationsLoading } = useOperationsSummary();

  if (isSalesLoading || isProductsLoading || isOrdersLoading || isCouponsLoading || isOperationsLoading) {
    return <div className="uix-admin-loading">Cargando command center...</div>;
  }

  const alerts = Array.isArray(operations?.alerts) ? operations.alerts : [];
  const lowStock = Array.isArray(operations?.inventory?.lowStockProducts) ? operations.inventory.lowStockProducts : [];
  const stripeEvents = Array.isArray(operations?.recentStripeEvents) ? operations.recentStripeEvents : [];
  const auditEvents = Array.isArray(operations?.recentAuditLogs) ? operations.recentAuditLogs : Array.isArray(operations?.audit?.recent) ? operations.audit.recent : [];
  const top = Array.isArray(topProducts) ? topProducts : [];
  const recent = Array.isArray(recentOrders) ? recentOrders : [];
  const activeCoupons = Array.isArray(coupons) ? coupons.filter((coupon: any) => Number(coupon.current_uses || 0) > 0) : [];
  const failedWebhooks = Number(operations?.payments?.failedStripeEvents || 0);
  const pendingOrders = Number(operations?.orders?.pending || 0);

  return (
    <div className="uix-admin-command-center">
      <section className="uix-admin-command-hero">
        <div>
          <p className="uix-admin-eyebrow">UIX System B</p>
          <h1>Command center administrativo</h1>
          <p>
            Panel organizado por prioridad real: primero riesgos, después ventas, operación, catálogo, clientes y sistema.
          </p>
        </div>
        <div className="uix-admin-command-hero__status">
          <span className={alerts.length || failedWebhooks || pendingOrders ? 'is-warning' : 'is-ok'}>
            {alerts.length || failedWebhooks || pendingOrders ? 'Revisión necesaria' : 'Operación estable'}
          </span>
          <strong>{formatCurrency(operations?.payments?.revenueToday)}</strong>
          <small>Ingresos capturados hoy</small>
        </div>
      </section>

      <AdminCommandAlert alerts={alerts} />

      <AdminCommandSection eyebrow="Ahora" title="Prioridades críticas">
        <div className="uix-admin-command-metric-grid is-critical">
          <AdminCommandMetric label="Pedidos pendientes" value={pendingOrders} detail="Fulfillment y atención" icon={ShoppingCart} priority={pendingOrders > 0 ? 'warning' : 'success'} />
          <AdminCommandMetric label="Stock bajo" value={lowStock.length} detail="Riesgo de venta perdida" icon={Package} priority={lowStock.length > 0 ? 'warning' : 'success'} />
          <AdminCommandMetric label="Webhooks con error" value={failedWebhooks} detail="Stripe / pagos" icon={AlertTriangle} priority={failedWebhooks > 0 ? 'critical' : 'success'} />
          <AdminCommandMetric label="Ingresos hoy" value={formatCurrency(operations?.payments?.revenueToday)} detail="Revenue del día" icon={Activity} priority="revenue" />
        </div>
      </AdminCommandSection>

      <AdminCommandSection eyebrow="Negocio" title="Indicadores comerciales">
        <div className="uix-admin-command-metric-grid">
          <AdminCommandMetric label="Ingresos totales" value={formatCurrency(sales?.total_revenue)} detail="Histórico" icon={DollarSign} priority="revenue" />
          <AdminCommandMetric label="Órdenes totales" value={sales?.total_orders || 0} detail="Ventas acumuladas" icon={ShoppingCart} />
          <AdminCommandMetric label="Ticket promedio" value={formatCurrency(sales?.average_order_value)} detail="AOV" icon={TrendingUp} />
          <AdminCommandMetric label="Clientes únicos" value={sales?.total_customers || 0} detail="Compradores" icon={Users} />
        </div>
      </AdminCommandSection>

      <section className="uix-admin-command-chart-grid">
        <AdminCommandPanel title="Ventas últimos 30 días" label="Revenue diario" action="Tendencia">
          <div className="uix-admin-command-chart">
            {sales?.sales_by_day?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sales.sales_by_day}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(74,55,40,.12)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#7c6d61' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#7c6d61' }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value: any) => [`$${value}`, 'Ingresos']} contentStyle={{ borderRadius: 16, border: '1px solid rgba(74,55,40,.12)' }} />
                  <Line type="monotone" dataKey="revenue" name="Ingresos" stroke="#2b1d17" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="uix-admin-command-empty">Sin datos de ventas recientes.</p>}
          </div>
        </AdminCommandPanel>

        <AdminCommandPanel title="Ingresos mensuales" label="Performance" action="Mes a mes">
          <div className="uix-admin-command-chart">
            {sales?.sales_by_month?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales.sales_by_month}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(74,55,40,.12)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#7c6d61' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#7c6d61' }} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value: any) => [`$${value}`, 'Ingresos']} cursor={{ fill: 'rgba(169,134,99,.08)' }} contentStyle={{ borderRadius: 16, border: '1px solid rgba(74,55,40,.12)' }} />
                  <Bar dataKey="revenue" name="Ingresos" fill="#a98663" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="uix-admin-command-empty">Sin datos de ingresos mensuales.</p>}
          </div>
        </AdminCommandPanel>
      </section>

      <AdminCommandSection eyebrow="Operación diaria" title="Fulfillment, pagos y catálogo">
        <div className="uix-admin-command-panel-grid">
          <AdminCommandPanel title="Órdenes recientes" label="Fulfillment" action="Últimas ventas">
            <AdminCommandList empty="Sin órdenes todavía.">
              {recent.slice(0, 6).map((order: any) => (
                <AdminCommandListRow key={order.id} title={order.customer_email || 'Invitado'} subtitle={formatDate(order.created_at)} meta={formatCurrency(order.total)} status={formatStatus(order.status)} tone={order.status === 'paid' || order.status === 'completed' || order.status === 'entregado' ? 'ok' : 'warning'} />
              ))}
            </AdminCommandList>
          </AdminCommandPanel>

          <AdminCommandPanel title="Stock bajo" label="Inventario" action={`${lowStock.length} alertas`}>
            <AdminCommandList empty="Sin productos en bajo stock.">
              {lowStock.slice(0, 6).map((product: any) => (
                <AdminCommandListRow key={product.id} title={product.name} subtitle="Producto en riesgo" status={`${product.stock} disponibles`} tone="danger" />
              ))}
            </AdminCommandList>
          </AdminCommandPanel>

          <AdminCommandPanel title="Stripe y webhooks" label="Pagos" action="Últimos eventos">
            <AdminCommandList empty="Sin eventos recientes.">
              {stripeEvents.slice(0, 5).map((event: any) => (
                <AdminCommandListRow key={event.id} title={event.type} subtitle={event.error_message || formatDate(event.created_at)} status={event.processed_at && !event.error_message ? 'OK' : 'Revisar'} tone={event.processed_at && !event.error_message ? 'ok' : 'danger'} />
              ))}
            </AdminCommandList>
          </AdminCommandPanel>
        </div>
      </AdminCommandSection>

      <AdminCommandSection eyebrow="Crecimiento" title="Catálogo, promociones y clientes">
        <div className="uix-admin-command-panel-grid">
          <AdminCommandPanel title="Productos top" label="Catálogo" action="Más vendidos">
            <AdminCommandList empty="Aún no hay ranking de productos.">
              {top.slice(0, 5).map((product: any, index: number) => (
                <AdminCommandListRow key={product.id || index} title={product.name || product.product_name || 'Producto'} subtitle={`${product.total_sold || product.quantity || 0} unidades`} meta={formatCurrency(product.revenue || product.total_revenue)} status="Top" />
              ))}
            </AdminCommandList>
          </AdminCommandPanel>

          <AdminCommandPanel title="Cupones activos" label="Promociones" action="Uso real">
            <AdminCommandList empty="Ningún cupón ha sido usado todavía.">
              {activeCoupons.slice(0, 5).map((coupon: any, index: number) => (
                <AdminCommandListRow key={coupon.id || index} title={coupon.code} subtitle={coupon.discount_type === 'percentage' ? `${coupon.discount_value}% OFF` : formatCurrency(coupon.discount_value)} status={`${coupon.current_uses} usos`} />
              ))}
            </AdminCommandList>
          </AdminCommandPanel>

          <AdminCommandPanel title="Auditoría reciente" label="Sistema" action="Trazabilidad">
            <AdminCommandList empty="Sin eventos de auditoría recientes.">
              {auditEvents.slice(0, 5).map((event: any, index: number) => (
                <AdminCommandListRow key={event.id || index} title={event.action || event.event_type || 'Evento'} subtitle={event.resource || event.entity_type || formatDate(event.created_at)} status={<ShieldCheck size={15} />} tone="ok" />
              ))}
            </AdminCommandList>
          </AdminCommandPanel>
        </div>
      </AdminCommandSection>

      <section className="uix-admin-command-actions">
        <div><Zap size={18} /><strong>Primero riesgo</strong><span>Alertas, pagos, stock y pedidos pendientes antes de campañas.</span></div>
        <div><Tag size={18} /><strong>Después conversión</strong><span>Productos top, cupones y AOV para decidir mejoras comerciales.</span></div>
        <div><Activity size={18} /><strong>Finalmente sistema</strong><span>Auditoría, emails y salud operativa para sostener crecimiento.</span></div>
      </section>
    </div>
  );
}
