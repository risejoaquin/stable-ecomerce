import React from 'react';
import { useAdminSales, useTopProducts, useRecentOrders } from '../../hooks/useAnalytics';
import { DollarSign, ShoppingCart, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const MetricCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-4">
    <div className={`w-12 h-12 rounded-full flex items-center justify-center`} style={{ backgroundColor: `\${color}15`, color }}>
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

  if (isSalesLoading || isProductsLoading || isOrdersLoading) return <div className="p-10">Loading analytics...</div>;

  const formatCurrency = (val: number) => `\$\${(val || 0).toFixed(2)}`;

  return (
    <div className="p-10 flex flex-col gap-8 h-full overflow-y-auto">
      <div>
        <h2 className="font-serif text-2xl text-[#333] mb-6">Dashboard Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <MetricCard 
            title="Total Revenue" 
            value={formatCurrency(sales?.total_revenue)} 
            icon={DollarSign} 
            color="#10B981" 
          />
          <MetricCard 
            title="Total Orders" 
            value={sales?.total_orders || 0} 
            icon={ShoppingCart} 
            color="#3B82F6" 
          />
          <MetricCard 
            title="Avg Order Value" 
            value={formatCurrency(sales?.average_order_value)} 
            icon={TrendingUp} 
            color="#8B5CF6" 
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100">
            <h3 className="font-bold text-lg mb-6">Sales (Last 30 Days)</h3>
            <div className="h-72">
              {sales?.sales_by_day && sales.sales_by_day.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sales.sales_by_day}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickLine={false} axisLine={false} tickFormatter={(val) => `\$\${val}`} />
                    <Tooltip 
                      formatter={(value: any) => [`\$\${value}`, 'Revenue']}
                      labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '8px' }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line type="monotone" dataKey="revenue" stroke="#6B705C" strokeWidth={3} dot={{ r: 4, fill: '#6B705C', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No sales data available.</div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-8">
            <div className="bg-white p-6 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-lg mb-4">Top Products</h3>
              {topProducts && topProducts.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {topProducts.map((p: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.quantity} sold</p>
                      </div>
                      <p className="text-sm font-bold text-[#6B705C]">{formatCurrency(p.revenue)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No data.</p>
              )}
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-lg mb-4">Recent Orders</h3>
              {recentOrders && recentOrders.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {recentOrders.map((o: any) => (
                    <div key={o.id} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate max-w-[150px]">{o.customer_email}</p>
                        <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#6B705C]">{formatCurrency(o.total)}</p>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full \${
                          o.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {o.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No orders yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
