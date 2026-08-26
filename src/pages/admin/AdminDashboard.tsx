import React from 'react';
import { useAdminSales, useTopProducts, useRecentOrders, useCouponsAnalytics } from '../../hooks/useAnalytics';
import { DollarSign, ShoppingCart, TrendingUp, Users, Tag } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MetricCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${color}15`, color }}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

export function AdminDashboard() {
  const { data: sales, isLoading: isSalesLoading } = useAdminSales();
  const { data: topProducts, isLoading: isProductsLoading } = useTopProducts();
  const { data: recentOrders, isLoading: isOrdersLoading } = useRecentOrders();
  const { data: coupons, isLoading: isCouponsLoading } = useCouponsAnalytics();

  if (isSalesLoading || isProductsLoading || isOrdersLoading || isCouponsLoading) return <div className="p-4 sm:p-10 flex items-center justify-center text-gray-500">Cargando métricas...</div>;

  const formatCurrency = (val: number) => `MXN $${(val || 0).toFixed(2)}`;

  return (
    <div className="p-4 sm:p-10 flex flex-col gap-8 h-full overflow-y-auto bg-[var(--color-background)]">
      <div>
        <h2 className="font-serif text-3xl text-[var(--color-text)] mb-8">Panel de Control</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard 
            title="Ingresos Totales" 
            value={formatCurrency(sales?.total_revenue)} 
            icon={DollarSign} 
            color="#10B981" 
          />
          <MetricCard 
            title="Ventas Totales" 
            value={sales?.total_orders || 0} 
            icon={ShoppingCart} 
            color="#3B82F6" 
          />
          <MetricCard 
            title="Ticket Promedio" 
            value={formatCurrency(sales?.average_order_value)} 
            icon={TrendingUp} 
            color="#8B5CF6" 
          />
          <MetricCard 
            title="Clientes Únicos" 
            value={sales?.total_customers || 0} 
            icon={Users} 
            color="#F59E0B" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Ventas Diarias */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-6 text-gray-800">Ventas (Últimos 30 Días)</h3>
            <div className="h-72">
              {sales?.sales_by_day && sales.sales_by_day.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sales.sales_by_day}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      formatter={(value: any) => [`$${value}`, 'Ingresos']}
                      labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '8px' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="revenue" name="Ingresos" stroke="#6B705C" strokeWidth={3} dot={{ r: 4, fill: '#6B705C', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">Sin datos de ventas recientes.</div>
              )}
            </div>
          </div>

          {/* Ingresos Mensuales */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-6 text-gray-800">Ingresos Mensuales</h3>
            <div className="h-72">
              {sales?.sales_by_month && sales.sales_by_month.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sales.sales_by_month}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      formatter={(value: any) => [`$${value}`, 'Ingresos']}
                      cursor={{fill: '#f3f4f6'}}
                      labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '8px' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="revenue" name="Ingresos" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">Sin datos de ingresos mensuales.</div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Top Productos */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Tag size={20} className="text-[var(--color-primary)]"/> Productos Más Vendidos</h3>
            {topProducts && topProducts.length > 0 ? (
              <div className="flex flex-col gap-4">
                {topProducts.map((p: any, i: number) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.quantity} unidades vendidas</p>
                    </div>
                    <p className="text-sm font-bold text-[var(--color-primary)]">{formatCurrency(p.revenue)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sin datos.</p>
            )}
          </div>

          {/* Cupones Usados */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><DollarSign size={20} className="text-[var(--color-primary)]"/> Cupones Populares</h3>
            {coupons && coupons.length > 0 ? (
              <div className="flex flex-col gap-3">
                {coupons.filter((c: any) => c.current_uses > 0).slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{c.code}</p>
                      <p className="text-xs text-gray-500">
                        Descuento: {c.discount_type === 'percentage' ? `${c.discount_value}%` : formatCurrency(c.discount_value)}
                      </p>
                    </div>
                    <div className="bg-[var(--color-primary)] text-white text-xs font-bold px-2 py-1 rounded-full">
                      {c.current_uses} usos
                    </div>
                  </div>
                ))}
                {coupons.filter((c: any) => c.current_uses > 0).length === 0 && (
                   <p className="text-sm text-gray-500">Ningún cupón ha sido usado todavía.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No hay cupones creados.</p>
            )}
          </div>

          {/* Órdenes Recientes */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingCart size={20} className="text-[var(--color-primary)]"/> Órdenes Recientes</h3>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="flex flex-col gap-4">
                {recentOrders.map((o: any) => (
                  <div key={o.id} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{o.customer_email || 'Invitado'}</p>
                      <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[var(--color-primary)]">{formatCurrency(o.total)}</p>
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        o.status === 'pagado' ? 'bg-green-100 text-green-700' : 
                        o.status === 'entregado' ? 'bg-teal-100 text-teal-700' :
                        o.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {o.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Sin órdenes todavía.</p>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
