import React, { useState } from 'react';
import { useAdminCoupons, useCreateCoupon, useDeleteCoupon } from '../../hooks/useCoupon';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function CouponsPage() {
  const { data: coupons, isLoading } = useAdminCoupons();
  const createCoupon = useCreateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    min_order_amount: '',
    max_uses: '',
    expires_at: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.discount_value) {
      toast.error('Code and discount value are required');
      return;
    }
    
    const payload = {
      ...formData,
      discount_value: Number(formData.discount_value),
      min_order_amount: formData.min_order_amount ? Number(formData.min_order_amount) : null,
      max_uses: formData.max_uses ? Number(formData.max_uses) : null,
      expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null
    };

    createCoupon.mutate(payload, {
      onSuccess: () => {
        toast.success('Coupon created');
        setShowForm(false);
        setFormData({ code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_uses: '', expires_at: '' });
      },
      onError: (err: any) => toast.error(err.message)
    });
  };

  return (
    <div className="p-10 flex flex-col h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="font-serif text-2xl text-[#333]">Discount Coupons</h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-[#5a5e4d] transition-colors"
        >
          <Plus size={16} /> Create Coupon
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-100 mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Code</label>
            <input type="text" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} className="border p-2 rounded-lg" placeholder="SUMMER24" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Type</label>
            <select value={formData.discount_type} onChange={e => setFormData({...formData, discount_type: e.target.value})} className="border p-2 rounded-lg bg-white">
              <option value="percentage">Percentage (%)</option>
              <option value="fixed_amount">Fixed Amount ($)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Value</label>
            <input type="number" required value={formData.discount_value} onChange={e => setFormData({...formData, discount_value: e.target.value})} className="border p-2 rounded-lg" min="0" step="0.01" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Min Order Amount (optional)</label>
            <input type="number" value={formData.min_order_amount} onChange={e => setFormData({...formData, min_order_amount: e.target.value})} className="border p-2 rounded-lg" min="0" step="0.01" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Max Uses (optional)</label>
            <input type="number" value={formData.max_uses} onChange={e => setFormData({...formData, max_uses: e.target.value})} className="border p-2 rounded-lg" min="1" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Expiration Date (optional)</label>
            <input type="date" value={formData.expires_at} onChange={e => setFormData({...formData, expires_at: e.target.value})} className="border p-2 rounded-lg" />
          </div>
          <div className="md:col-span-2 mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={createCoupon.isPending} className="px-4 py-2 bg-[#6B705C] text-white rounded-lg text-sm">{createCoupon.isPending ? 'Saving...' : 'Save Coupon'}</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-gray-500">Loading coupons...</div>
      ) : (
        <div className="bg-white border border-[#E5E5E1] rounded-2xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#FDFCFB] border-b border-[#E5E5E1] text-[11px] uppercase tracking-wider text-gray-500 font-bold">
              <tr>
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Discount</th>
                <th className="px-6 py-4">Usage</th>
                <th className="px-6 py-4">Expires</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {coupons?.map((c: any) => (
                <tr key={c.id} className="border-b border-[#E5E5E1] last:border-0 hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-bold text-gray-900">{c.code}</td>
                  <td className="px-6 py-4">
                    {c.discount_type === 'percentage' ? `\${c.discount_value}%` : `$\${c.discount_value}`}
                  </td>
                  <td className="px-6 py-4">
                    {c.current_uses} {c.max_uses ? `/ \${c.max_uses}` : ''}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    {c.is_active ? (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Active</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase tracking-wider">Inactive</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => {
                        if (confirm('Delete this coupon?')) {
                          deleteCoupon.mutate(c.id);
                        }
                      }}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!coupons || coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No coupons found.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
