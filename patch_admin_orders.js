import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/AdminOrdersPage.tsx', 'utf-8');

// Imports
if (!code.includes("import { useUpdateOrderTracking }")) {
    code = code.replace(
        "import { useAdminOrders } from '../../hooks/useAdminOrders';",
        "import { useAdminOrders, useUpdateOrderTracking } from '../../hooks/useAdminOrders';"
    );
}

// Add state for tracking and notes inside OrderDetailModal
const modalCompRegex = /function OrderDetailModal\(\{ orderId, onClose \}: \{ orderId: string, onClose: \(\) => void \}\) \{/;
const modalStateInjection = `
function OrderDetailModal({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [notes, setNotes] = React.useState('');
`;
code = code.replace(modalCompRegex, modalStateInjection);

// Initialize state when order loads
const useEffectInjection = `
  const { data: order, isLoading } = useAdminOrder(orderId);
  const updateTracking = useUpdateOrderTracking(orderId);
  
  React.useEffect(() => {
    if (order) {
      setTrackingNumber(order.tracking_number || '');
      setNotes(order.notes || '');
    }
  }, [order]);
`;
code = code.replace(/const \{ data: order, isLoading \} = useAdminOrder\(orderId\);/, useEffectInjection);

// Add tracking section to the right column
const rightColumnRegex = /<div className="space-y-6">\s*<div>\s*<h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Customer<\/h3>/;
const trackingSection = `
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
`;
code = code.replace(rightColumnRegex, trackingSection.trim());

fs.writeFileSync('src/pages/admin/AdminOrdersPage.tsx', code);
