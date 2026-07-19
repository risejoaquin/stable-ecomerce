import { EmptyState } from '../../components/EmptyState';
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { toast } from 'react-hot-toast';
import { Search, Filter, Download, Eye, X, Check, Package, RotateCcw } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminOrders, useAdminOrder, useUpdateOrderTracking, useUpdateOrderStatus, useRefundOrder } from '../../hooks/useAdminOrders';

export function AdminOrdersPage() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const { data: response, isLoading } = useAdminOrders({ status: filterStatus, page, pageSize: 20 });
  const orders = response?.data || [];
  const totalPages = response && response.total ? Math.ceil(response.total / (response.pageSize || 20)) : 1;

  // New order notification
  const [previousOrderCount, setPreviousOrderCount] = useState<number | null>(null);
  
  useEffect(() => {
    if (response && previousOrderCount !== null && response.total > previousOrderCount) {
      toast.success('New order received!', { icon: '🛍️' });
    }
    if (response) {
      setPreviousOrderCount(response.total || 0);
    }
  }, [response, previousOrderCount]);

  const filteredOrders = orders;

  const exportCSV = () => {
    if (!filteredOrders.length) return;
    const headers = ['Order ID', 'Date', 'Amount', 'Status', 'Customer'];
    const csvContent = [
      headers.join(','),
      ...filteredOrders.map((o: any) => 
        `"${o.id}","${new Date(o.created_at).toLocaleString()}","${o.total}","${o.status}","${o.customer_email || o.customer_user_id || 'Guest'}"`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders_export_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
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

  return (
    <div className="p-10 flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-[#333]">Orders</h2>
        <button 
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E1] rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="flex gap-2">
        {['all', 'pendiente', 'pagado', 'empacado', 'enviado', 'entregado', 'cancelado'].map(status => (
          <button
            key={status}
            onClick={() => { setFilterStatus(status); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors ${
              filterStatus === status 
                ? 'bg-[#6B705C] text-white' 
                : 'bg-white text-gray-500 border border-[#E5E5E1] hover:bg-gray-50'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[24px] border border-[#E5E5E1] flex-1 p-6 overflow-auto">
        {isLoading ? <p>Loading orders...</p> : (
          <div className="overflow-x-auto"><table className="w-full text-left border-collapse">
            <thead className="text-[10px] uppercase tracking-widest font-bold text-[#A5A58D] border-b border-[#F0EFE9]">
              <tr className="h-10">
                <th className="font-medium pb-2">Order ID</th>
                <th className="font-medium pb-2">Date</th>
                <th className="font-medium pb-2">Customer</th>
                <th className="font-medium pb-2">Amount</th>
                <th className="font-medium pb-2">Status</th>
                <th className="font-medium pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredOrders.map((o: any) => (
                <tr key={o.id} className="h-14 border-b border-[#F0EFE9] last:border-0 hover:bg-gray-50/50">
                  <td className="font-mono text-xs text-gray-500">#{o.id.split('-')[0]}</td>
                  <td className="text-gray-600">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="text-gray-900">{o.customerDetails?.name || o.customer_email || 'Guest'}</td>
                  <td className="text-gray-900 font-medium">MXN ${(Number(o.total) || 0).toFixed(2)}</td>
                  <td>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${getStatusColor(o.status)}`}>
                      {o.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-right">
                    <button 
                      onClick={() => setSelectedOrderId(o.id)}
                      className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredOrders?.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#A5A58D] text-sm">
                    No orders found matching the criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table></div>
        )}
      </div>

      {selectedOrderId && (
        <OrderDetailsModal 
          orderId={selectedOrderId} 
          onClose={() => setSelectedOrderId(null)} 
          getStatusColor={getStatusColor}
        />
      )}
    </div>
  );
}

function OrderDetailsModal({ orderId, onClose, getStatusColor }: { orderId: string, onClose: () => void, getStatusColor: (s:string)=>string }) {
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  const { data: order, isLoading } = useAdminOrder(orderId);
  const updateStatus = useUpdateOrderStatus(orderId);
  const refundOrder = useRefundOrder(orderId);
  const updateTracking = useUpdateOrderTracking(orderId);
  
  React.useEffect(() => {
    if (order) {
      setTrackingNumber(order.tracking_number || '');
      setNotes(order.notes || '');
    }
  }, [order]);

  

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl bg-[#FDFCFB] rounded-[24px] shadow-2xl p-8 z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-6">
            <div>
              <Dialog.Title className="text-2xl font-serif text-gray-900 flex items-center gap-3">
                Order #{orderId.split('-')[0]}
                {order && (
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider font-sans ${getStatusColor(order.status)}`}>
                    {order.status.replace('_', ' ')}
                  </span>
                )}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-gray-500 mt-1">
                Placed on {order ? new Date(order.created_at).toLocaleString() : '...'}
              </Dialog.Description>
            </div>
            <Dialog.Close className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors">
              <X size={20} />
            </Dialog.Close>
          </div>

          {isLoading ? (
            <div className="py-20 text-center text-gray-500">Loading details...</div>
          ) : order ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left Column: Items */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Items</h3>
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto"><table className="w-full text-left">
                      <tbody className="divide-y divide-gray-100">
                        {order.order_items?.map((item: any) => (
                          <tr key={item.id}>
                            <td className="py-3 px-4 flex items-center gap-3">
                              {item.products?.images?.[0] ? (
                                <img src={item.products.images[0]} alt="" className="w-10 h-10 object-cover rounded bg-gray-50" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400"><Package size={20}/></div>
                              )}
                              <div>
                                <p className="font-medium text-sm text-gray-900">{item.products?.name || 'Unknown Product'}</p>
                                <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right text-sm font-medium text-gray-900">
                              MXN ${(item.unit_price * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50 border-t border-gray-100">
                        <tr>
                          <td className="py-3 px-4 text-right text-sm text-gray-500 font-medium">Total</td>
                          <td className="py-3 px-4 text-right text-base font-bold text-gray-900">MXN ${Number(order.total).toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table></div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Actions</h3>
                  <div className="flex flex-wrap gap-3">
                    {order.status === 'pagado' && (
                      <button 
                        onClick={() => updateStatus.mutate('empacado')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                      >
                        <Check size={16} /> Marcar como Empacado
                      </button>
                    )}
                    {order.status === 'empacado' && (
                      <button 
                        onClick={() => updateStatus.mutate('enviado')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                      >
                        <Check size={16} /> Marcar como Enviado
                      </button>
                    )}
                    {order.status === 'enviado' && (
                      <button 
                        onClick={() => updateStatus.mutate('entregado')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-opacity-90 disabled:opacity-50 transition-colors"
                      >
                        <Check size={16} /> Marcar como Entregado
                      </button>
                    )}
                    {['pendiente', 'pagado', 'empacado', 'enviado'].includes(order.status) && (
                      <button 
                        onClick={() => updateStatus.mutate('cancelado')}
                        disabled={updateStatus.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        <X size={16} /> Cancelar Pedido
                      </button>
                    )}
                    {['pagado', 'empacado', 'enviado'].includes(order.status) && (
                      <button 
                        onClick={() => {
                          if (window.confirm('Are you sure you want to refund this order?')) {
                            refundOrder.mutate();
                          }
                        }}
                        disabled={refundOrder.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <RotateCcw size={16} /> Refund Order
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Customer & Shipping */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Tracking & Notes</h3>
                  <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Tracking Number</label>
                      <input 
                        type="text" 
                        value={trackingNumber}
                        onChange={(e) => setTrackingNumber(e.target.value)}
                        placeholder="e.g. 1Z9999999999999999"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6B705C]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Internal Notes</label>
                      <textarea 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notes for this order..."
                        rows={3}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#6B705C] resize-none"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        updateTracking.mutate({ tracking_number: trackingNumber, notes }, {
                          onSuccess: () => toast.success('Tracking updated')
                        });
                      }}
                      disabled={updateTracking.isPending}
                      className="w-full bg-gray-900 text-white text-sm font-medium py-2 rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      {updateTracking.isPending ? 'Saving...' : 'Save Tracking Info'}
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Customer</h3>
                  <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm space-y-2">
                    <p className="font-medium text-gray-900">{order.customerDetails?.name || 'N/A'}</p>
                    <p className="text-gray-500">{order.customerDetails?.email || order.customer_email || 'No email'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Shipping Address</h3>
                  <div className="bg-white rounded-xl border border-gray-100 p-4 text-sm text-gray-600 leading-relaxed">
                    {order.shippingDetails?.address ? (
                      <>
                        <p>{order.shippingDetails.name}</p>
                        <p>{order.shippingDetails.address.line1}</p>
                        {order.shippingDetails.address.line2 && <p>{order.shippingDetails.address.line2}</p>}
                        <p>{order.shippingDetails.address.city}, {order.shippingDetails.address.state} {order.shippingDetails.address.postal_code}</p>
                        <p>{order.shippingDetails.address.country}</p>
                      </>
                    ) : (
                      <p className="text-gray-400 italic">No shipping details available.</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Stripe Reference</h3>
                  <p className="font-mono text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100 break-all">
                    {order.stripe_session_id || 'N/A'}
                  </p>
                </div>
              </div>
              
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">Order not found.</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
