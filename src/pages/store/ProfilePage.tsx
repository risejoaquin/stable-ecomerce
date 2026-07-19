import React, { useState } from 'react';
import { useAuthSafe } from '../../hooks/useAuthSafe';
import { StoreHeader } from '../../components/storefront/StoreHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { toast } from 'react-hot-toast';

export function ProfilePage() {
  const { isSignedIn } = useAuthSafe();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => apiClient.get('/profile'),
    enabled: isSignedIn
  });

  const updateProfile = useMutation({
    mutationFn: (data: any) => apiClient.put('/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile');
    }
  });

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    shippingAddress: { street: '', city: '', state: '', zip: '', country: '' },
    billingAddress: { street: '', city: '', state: '', zip: '', country: '' }
  });

  React.useEffect(() => {
    if (profile) {
      let shipAddr = { street: '', city: '', state: '', zip: '', country: '' };
      let billAddr = { street: '', city: '', state: '', zip: '', country: '' };
      
      try {
        if (profile.shipping_address) shipAddr = { ...shipAddr, ...JSON.parse(profile.shipping_address) };
      } catch (e) {
        shipAddr.street = profile.shipping_address || '';
      }
      
      try {
        if (profile.billing_address) billAddr = { ...billAddr, ...JSON.parse(profile.billing_address) };
      } catch (e) {
        billAddr.street = profile.billing_address || '';
      }

      setFormData({
        email: profile.email || '',
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        shippingAddress: shipAddr,
        billingAddress: billAddr
      });
    }
  }, [profile]);

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;

  const renderAddressFields = (type: 'shippingAddress' | 'billingAddress', label: string) => (
    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
      <h3 className="font-semibold text-lg text-gray-900 mb-4">{label}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
          <input
            type="text"
            value={formData[type].street}
            onChange={e => setFormData(f => ({ ...f, [type]: { ...f[type], street: e.target.value } }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            placeholder="123 Main St"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
          <input
            type="text"
            value={formData[type].city}
            onChange={e => setFormData(f => ({ ...f, [type]: { ...f[type], city: e.target.value } }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            placeholder="City"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">State / Province</label>
          <input
            type="text"
            value={formData[type].state}
            onChange={e => setFormData(f => ({ ...f, [type]: { ...f[type], state: e.target.value } }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            placeholder="State"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">ZIP / Postal Code</label>
          <input
            type="text"
            value={formData[type].zip}
            onChange={e => setFormData(f => ({ ...f, [type]: { ...f[type], zip: e.target.value } }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            placeholder="12345"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
          <input
            type="text"
            value={formData[type].country}
            onChange={e => setFormData(f => ({ ...f, [type]: { ...f[type], country: e.target.value } }))}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
            placeholder="Country"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <StoreHeader />
      
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate({
              email: formData.email,
              fullName: formData.fullName,
              phone: formData.phone,
              shippingAddress: JSON.stringify(formData.shippingAddress),
              billingAddress: JSON.stringify(formData.billingAddress)
            });
          }} className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="John Doe"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="+1 234 567 890"
              />
            </div>

            {renderAddressFields('shippingAddress', 'Shipping Address')}
            {renderAddressFields('billingAddress', 'Billing Address')}

            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="w-full mt-4 bg-black text-white font-bold py-4 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </button>
            
          </form>
        </div>
      </main>
    </div>
  );
}
