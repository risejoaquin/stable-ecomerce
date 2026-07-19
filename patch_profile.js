import fs from 'fs';
let content = fs.readFileSync('src/pages/store/ProfilePage.tsx', 'utf8');

// The new profile page logic handles multiple addresses
const newContent = `import React, { useState } from 'react';
import { useAuthSafe } from '../../hooks/useAuthSafe';
import { StoreHeader } from '../../components/storefront/StoreHeader';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { toast } from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';

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
      toast.success('Perfil actualizado correctamente');
    },
    onError: () => {
      toast.error('Error al actualizar el perfil');
    }
  });

  const defaultAddress = { name: 'Casa', street: '', city: '', state: '', zip: '', country: '' };

  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    phone: '',
    addresses: [defaultAddress]
  });

  React.useEffect(() => {
    if (profile) {
      let loadedAddresses = [];
      try {
        if (profile.addresses) {
           loadedAddresses = typeof profile.addresses === 'string' ? JSON.parse(profile.addresses) : profile.addresses;
        } else if (profile.shipping_address) { // fallback to old format
           loadedAddresses = [{ name: 'Casa', ...JSON.parse(profile.shipping_address) }];
        }
      } catch (e) {
        loadedAddresses = [];
      }
      if (!Array.isArray(loadedAddresses) || loadedAddresses.length === 0) {
        loadedAddresses = [defaultAddress];
      }

      setFormData({
        email: profile.email || '',
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        addresses: loadedAddresses
      });
    }
  }, [profile]);

  if (isLoading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>;

  const addAddress = () => {
    setFormData(f => ({ ...f, addresses: [...f.addresses, { name: 'Nueva Dirección', street: '', city: '', state: '', zip: '', country: '' }] }));
  };

  const removeAddress = (index: number) => {
    setFormData(f => ({ ...f, addresses: f.addresses.filter((_, i) => i !== index) }));
  };

  const updateAddress = (index: number, field: string, value: string) => {
    setFormData(f => {
      const newAddresses = [...f.addresses];
      newAddresses[index] = { ...newAddresses[index], [field]: value };
      return { ...f, addresses: newAddresses };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <StoreHeader />
      
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mi Perfil</h1>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={(e) => {
            e.preventDefault();
            updateProfile.mutate({
              email: formData.email,
              fullName: formData.fullName,
              phone: formData.phone,
              addresses: formData.addresses // Send the array as JSON
            });
          }} className="flex flex-col gap-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => setFormData(f => ({ ...f, fullName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="+52 123 456 7890"
              />
            </div>

            <div className="mt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">Mis Direcciones</h2>
                <button type="button" onClick={addAddress} className="flex items-center gap-2 text-sm font-bold text-[#6B705C] hover:text-black transition-colors">
                  <Plus size={16} /> Añadir Dirección
                </button>
              </div>

              <div className="flex flex-col gap-8">
                {formData.addresses.map((address, index) => (
                  <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-200 relative">
                    <button 
                      type="button" 
                      onClick={() => removeAddress(index)} 
                      className="absolute top-4 right-4 text-red-400 hover:text-red-600 p-2 bg-white rounded-full shadow-sm"
                      title="Eliminar dirección"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2 pr-12">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Dirección (Casa, Trabajo, Departamento)</label>
                        <select
                          value={address.name}
                          onChange={e => updateAddress(index, 'name', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white font-medium"
                        >
                          <option value="Casa">Casa</option>
                          <option value="Trabajo">Trabajo</option>
                          <option value="Departamento">Departamento</option>
                          <option value="Otra">Otra</option>
                        </select>
                      </div>
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Calle y Número</label>
                        <input
                          type="text"
                          value={address.street}
                          onChange={e => updateAddress(index, 'street', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          placeholder="Av. Principal 123"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Ciudad</label>
                        <input
                          type="text"
                          value={address.city}
                          onChange={e => updateAddress(index, 'city', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          placeholder="Ciudad"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Estado / Provincia</label>
                        <input
                          type="text"
                          value={address.state}
                          onChange={e => updateAddress(index, 'state', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          placeholder="Estado"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Código Postal</label>
                        <input
                          type="text"
                          value={address.zip}
                          onChange={e => updateAddress(index, 'zip', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          placeholder="12345"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">País</label>
                        <input
                          type="text"
                          value={address.country}
                          onChange={e => updateAddress(index, 'country', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black bg-white"
                          placeholder="México"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {formData.addresses.length === 0 && (
                   <p className="text-gray-500 text-sm text-center py-4">No tienes direcciones guardadas. Añade una para facilitar tus compras.</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="w-full mt-6 bg-[#1a1a1a] text-white font-bold py-4 rounded-xl hover:bg-black transition-colors disabled:opacity-50 shadow-md"
            >
              {updateProfile.isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            
          </form>
        </div>
      </main>
    </div>
  );
}
`
fs.writeFileSync('src/pages/store/ProfilePage.tsx', newContent);
