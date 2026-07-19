import React, { useState } from 'react';
import { useAdminCustomers } from '../../hooks/useAdminCustomers';
import { Users, Search, Download } from 'lucide-react';

export function AdminCustomersPage() {
  const { data: customers, isLoading } = useAdminCustomers();
  const [searchTerm, setSearchTerm] = useState('');

  const formatCurrency = (val: number) => `MXN $${(val || 0).toFixed(2)}`;

  const exportCSV = () => {
    if (!customers) return;
    
    const headers = ['Email/ID', 'Orders Count', 'Total Spent', 'Last Order Date'];
    const csvContent = customers.map((c: any) => 
      `"${c.email}","${c.orders_count}","${c.total_spent}","${new Date(c.last_order_date).toLocaleString()}"`
    ).join('\n');
    
    const finalCsv = headers.join(',') + '\n' + csvContent;
    const blob = new Blob([finalCsv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
  };

  const filteredCustomers = customers?.filter((c: any) => 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-10 flex flex-col gap-6 h-full bg-[#FDFCFB]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-[#333] mb-1">Clientes</h2>
          <p className="text-gray-500 text-sm">Gestiona y analiza la información de tus compradores.</p>
        </div>
        <button 
          onClick={exportCSV}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#E5E5E1] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          <Download size={16} /> Exportar CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por correo electrónico..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6B705C]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="p-10 text-center text-gray-500">Cargando clientes...</div>
          ) : filteredCustomers && filteredCustomers.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Cliente</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-center">Compras</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Monto Gastado</th>
                  <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 text-right">Último Pedido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCustomers.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#6B705C] bg-opacity-10 flex items-center justify-center text-[#6B705C]">
                          <Users size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{customer.email}</p>
                          <p className="text-xs text-gray-500 truncate max-w-[200px]">{customer.id !== customer.email ? customer.id : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-2 bg-gray-100 rounded-full text-sm font-bold text-gray-700">
                        {customer.orders_count}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <p className="font-bold text-[#6B705C]">{formatCurrency(customer.total_spent)}</p>
                    </td>
                    <td className="p-4 text-right">
                      <p className="text-sm text-gray-600">{new Date(customer.last_order_date).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-400">{new Date(customer.last_order_date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-20 flex flex-col items-center justify-center text-gray-500">
              <Users size={48} className="text-gray-300 mb-4" />
              <p className="font-bold text-gray-700 mb-1">No se encontraron clientes</p>
              <p className="text-sm">Intenta con otros términos de búsqueda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
