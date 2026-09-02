import React from 'react';
import { useAdminSales, useTopProducts, useRecentOrders, useCouponsAnalytics, useOperationsSummary } from '../../hooks/useAnalytics';
import { AlertTriangle, Activity, DollarSign, ShoppingCart, TrendingUp, Users, Tag, Package, ShieldCheck, Zap } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (val: number) => `MXN $${Number(val || 0).toFixed(2)}`;

const MetricCard = ({ title, value, note, icon: Icon, tone = 'neutral' }: any) => (
  <div className={`ss-admin-metric-card ${tone}`}>
    <div className="ss-admin-metric-icon"><Icon size={20} /></div>
    <div className="min-w-0">
      <p className="ss-admin-kicker">{title}</p>
      <p className="ss-admin-metric-value">{value}</p>
      {note && <p className="ss-admin-muted">{note}</p>}
    </div>
  </div>
);

const Panel = ({ title, eyebrow, action, children, className = '' }: any) => (
  <section className={`ss-admin-panel ${className}`}>
    <div className="ss-admin-panel-head">
      <div>
        {eyebrow && <p className="ss-admin-kicker">{eyebrow}</p>}
        <h3>{title}</h3>
      </div>
      {action && <span className="ss-admin-panel-action">{action}</span>}
    </div>
    {children}
  </section>
);

export function AdminDashboard() {
  const { data: sales, isLoading: isSalesLoading } = useAdminSales();
  const { data: topProducts, isLoading: isProductsLoading } = useTopProducts();
  const { data: recentOrders, isLoading: isOrdersLoading } = useRecentOrders();
  const { data: coupons, isLoading: isCouponsLoading } = useCouponsAnalytics();
  const { data: operations, isLoading: isOperationsLoading } = useOperationsSummary();

  if (isSalesLoading || isProductsLoading || isOrdersLoading || isCouponsLoading || isOperationsLoading) {
    return <div className="ss-admin-loading">Cargando command center...</div>;
  }

  const alertCount = operations?.alerts?.length || 0;
  const lowStock = operations?.inventory?.lowStockProducts || [];
  const stripeEvents = operations?.recentStripeEvents || [];
  const auditEvents = operations?.recentAuditLogs || operations?.audit?.recent || [];
  const top = Array.isArray(topProducts) ? topProducts : [];
  const activeCoupons = Array.isArray(coupons) ? coupons.filter((c: any) => c.current_uses > 0) : [];

  return (
    <div className="ss-admin-dashboard">
      <section className="ss-admin-hero-panel">
        <div>
          <p className="ss-admin-kicker">Operations command center</p>
          <h1>Panel ejecutivo de tienda</h1>
          <p className="ss-admin-hero-copy">
            Revenue, pedidos, inventario, webhooks y actividad operativa organizados por prioridad. Lo urgente primero, lo analítico después.
          </p>
        </div>
        <div className="ss-admin-hero-status">
          <span className={alertCount > 0 ? 'is-warning' : 'is-ok'}>{alertCount > 0 ? `${alertCount} alertas` : 'Operación estable'}</span>
          <strong>{formatCurrency(operations?.payments?.revenueToday || 0)}</strong>
          <small>Ingresos de hoy</small>
        </div>
      </section>

      {alertCount > 0 && (
        <Panel title="Alertas que requieren atención" eyebrow="Prioridad operativa" className="ss-admin-alert-panel">
          <div className="ss-admin-alert-grid">
            {operations.alerts.map((alert: any) => (
              <div key={alert.code} className="ss-admin-alert-item">
                <span>{alert.level}</span>
                <p>{alert.message}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <section className="ss-admin-section-block">
        <div className="ss-admin-section-title">
          <p className="ss-admin-kicker">Hoy</p>
          <h2>Salud operativa</h2>
        </div>
        <div className="ss-admin-metric-grid critical">
          <MetricCard title="Ingresos hoy" value={formatCurrency(operations?.payments?.revenueToday || 0)} note="Revenue capturado" icon={Activity} tone="revenue" />
          <MetricCard title="Pedidos pendientes" value={operations?.orders?.pending || 0} note="Requieren seguimiento" icon={ShoppingCart} tone="orders" />
          <MetricCard title="Stock bajo" value={lowStock.length} note="Productos en riesgo" icon={Package} tone="stock" />
          <MetricCard title="Webhooks con error" value={operations?.payments?.failedStripeEvents || 0} note="Stripe / pagos" icon={AlertTriangle} tone="risk" />
        </div>
      </section>

      <section className="ss-admin-section-block">
        <div className="ss-admin-section-title">
          <p className="ss-admin-kicker">Negocio</p>
          <h2>KPIs comerciales</h2>
        </div>
        <div className="ss-admin-metric-grid">
          <MetricCard title="Ingresos totales" value={formatCurrency(sales?.total_revenue)} note="Histórico" icon={DollarSign} tone="revenue" />
          <MetricCard title="Ventas totales" value={sales?.total_orders || 0} note="Órdenes acumuladas" icon={ShoppingCart} tone="orders" />
          <MetricCard title="Ticket promedio" value={formatCurrency(sales?.average_order_value)} note="AOV" icon={TrendingUp} tone="growth" />
          <MetricCard title="Clientes únicos" value={sales?.total_customers || 0} note="Compradores" icon={Users} tone="customers" />
        </div>
      </section>

      <section className="ss-admin-chart-grid">
        <Panel title="Ventas últimos 30 días" eyebrow="Revenue diario" action="Tendencia">
          <div className="ss-admin-chart-box">
            {sales?.sales_by_day && sales.sales_by_day.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sales.sales_by_day}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(74,55,40,.12)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#7c6d61' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#7c6d61' }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip formatter={(value: any) => [`$${value}`, 'Ingresos']} contentStyle={{ borderRadius: 16, border: '1px solid rgba(74,55,40,.12)', boxShadow: '0 14px 34px rgba(75,56,40,.10)' }} />
                  <Line type="monotone" dataKey="revenue" name="Ingresos" stroke="#2b1d17" strokeWidth={3} dot={{ r: 3, fill: '#2b1d17', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="ss-admin-empty">Sin datos de ventas recientes.</div>}
          </div>
        </Panel>

        <Panel title="Ingresos mensuales" eyebrow="Performance" action="Mes a mes">
          <div className="ss-admin-chart-box">
            {sales?.sales_by_month && sales.sales_by_month.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sales.sales_by_month}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(74,55,40,.12)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#7c6d61' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#7c6d61' }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                  <Tooltip formatter={(value: any) => [`$${value}`, 'Ingresos']} cursor={{ fill: 'rgba(169,134,99,.08)' }} contentStyle={{ borderRadius: 16, border: '1px solid rgba(74,55,40,.12)' }} />
                  <Bar dataKey="revenue" name="Ingresos" fill="#a98663" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="ss-admin-empty">Sin datos de ingresos mensuales.</div>}
          </div>
        </Panel>
      </section>

      <section className="ss-admin-lower-grid">
        <Panel title="Órdenes recientes" eyebrow="Fulfillment" action="Últimas ventas">
          <div className="ss-admin-list">
            {recentOrders && recentOrders.length > 0 ? recentOrders.slice(0, 6).map((o: any) => (
              <div key={o.id} className="ss-admin-list-row">
                <div>
                  <strong>{o.customer_email || 'Invitado'}</strong>
                  <span>{new Date(o.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <strong>{formatCurrency(o.total)}</strong>
                  <em>{String(o.status || 'pendiente').replace('_', ' ')}</em>
                </div>
              </div>
            )) : <p className="ss-admin-empty">Sin órdenes todavía.</p>}
          </div>
        </Panel>

        <Panel title="Stock bajo" eyebrow="Inventario" action={`${lowStock.length} alertas`}>
          <div className="ss-admin-list">
            {lowStock.length > 0 ? lowStock.slice(0, 6).map((p: any) => (
              <div key={p.id} className="ss-admin-list-row compact">
                <div><strong>{p.name}</strong><span>SKU / producto</span></div>
                <em className="is-risk">{p.stock} disponibles</em>
              </div>
            )) : <p className="ss-admin-empty">Sin productos en bajo stock.</p>}
          </div>
        </Panel>

        <Panel title="Stripe y webhooks" eyebrow="Pagos" action="Últimos eventos">
          <div className="ss-admin-list">
            {stripeEvents.length > 0 ? stripeEvents.slice(0, 5).map((event: any) => (
              <div key={event.id} className="ss-admin-list-row compact">
                <div><strong>{event.type}</strong>{event.error_message && <span>{event.error_message}</span>}</div>
                <em className={event.processed_at && !event.error_message ? 'is-ok' : 'is-risk'}>{event.processed_at && !event.error_message ? 'OK' : 'Revisar'}</em>
              </div>
            )) : <p className="ss-admin-empty">Sin eventos recientes.</p>}
          </div>
        </Panel>

        <Panel title="Productos top" eyebrow="Catálogo" action="Más vendidos">
          <div className="ss-admin-list">
            {top.length > 0 ? top.slice(0, 5).map((p: any, i: number) => (
              <div key={p.id || i} className="ss-admin-list-row compact">
                <div><strong>{p.name || p.product_name}</strong><span>{p.total_sold || p.quantity || 0} unidades</span></div>
                <em>{formatCurrency(p.revenue || p.total_revenue || 0)}</em>
              </div>
            )) : <p className="ss-admin-empty">Aún no hay ranking de productos.</p>}
          </div>
        </Panel>

        <Panel title="Cupones activos" eyebrow="Promociones" action="Uso real">
          <div className="ss-admin-list">
            {activeCoupons.length > 0 ? activeCoupons.slice(0, 5).map((c: any, i: number) => (
              <div key={c.id || i} className="ss-admin-list-row compact">
                <div><strong>{c.code}</strong><span>{c.discount_type === 'percentage' ? `${c.discount_value}% OFF` : formatCurrency(c.discount_value)}</span></div>
                <em>{c.current_uses} usos</em>
              </div>
            )) : <p className="ss-admin-empty">Ningún cupón ha sido usado todavía.</p>}
          </div>
        </Panel>

        <Panel title="Auditoría reciente" eyebrow="Seguridad" action="Trazabilidad">
          <div className="ss-admin-list">
            {auditEvents.length > 0 ? auditEvents.slice(0, 5).map((a: any, i: number) => (
              <div key={a.id || i} className="ss-admin-list-row compact">
                <div><strong>{a.action || a.event_type || 'Evento'}</strong><span>{a.resource || a.entity_type || a.created_at || 'Actividad operativa'}</span></div>
                <ShieldCheck size={16} />
              </div>
            )) : <p className="ss-admin-empty">Sin eventos de auditoría recientes.</p>}
          </div>
        </Panel>
      </section>

      <section className="ss-admin-next-actions">
        <div><Zap size={18} /><strong>Prioridad</strong><span>Revisar alertas, stock bajo y webhooks antes de optimizar campañas.</span></div>
        <div><Tag size={18} /><strong>Comercial</strong><span>Validar productos top, cupones usados y ticket promedio.</span></div>
        <div><Activity size={18} /><strong>Operación</strong><span>Usar el dashboard como command center diario, no como lista desordenada de métricas.</span></div>
      </section>
    </div>
  );
}
