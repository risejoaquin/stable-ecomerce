import { StoreSettingsForm } from '../../components/admin/StoreSettingsForm';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { toast } from 'react-hot-toast';
import { useUpdateStoreConfig } from '../../hooks/useUpdateStoreConfig';
import { Check, Image as ImageIcon, Layout as LayoutIcon, Type, Palette, Monitor, Upload } from 'lucide-react';
import { useAuthSafe as useAuth } from '../../hooks/useAuthSafe';

export function AdminSettingsPage() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  
  const { data: store, isLoading } = useQuery({
    queryKey: ['store-config'], // we can use public store or admin store
    queryFn: async () => { const data = await apiClient.get('/public/store'); return data.store || data; },
  });

  const updateConfigBase = useUpdateStoreConfig();
  const updateConfig = {
    isPending: updateConfigBase.isPending,
    mutate: (config: any) => {
      updateConfigBase.mutate(config, {
        onSuccess: () => toast.success('Settings saved successfully'),
        onError: (err: any) => toast.error(err.message || 'Failed to save settings')
      });
    }
  };

  const [activeTab, setActiveTab] = useState<'theme' | 'content'>('theme');
  
  const [config, setConfig] = useState<any>({
    themeColor: '#6B705C',
    secondaryColor: '#A5A58D',
    backgroundColor: '#FDFCFB',
    textColor: '#333333',
    buttonColor: '#6B705C',
    fontFamily: 'Inter',
    borderRadius: 'xl',
    logoUrl: '',
    faviconUrl: '',
    footerText: '',
    layout: 'grid',
    heroBanner: {
      image: '',
      title: '',
      subtitle: ''
    }
  });

  useEffect(() => {
    if (store?.config) {
      setConfig((prev: any) => ({ ...prev, ...store.config }));
    }
  }, [store]);

  const updateConfigField = (field: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [field]: value }));
  };

  const updateHeroField = (field: string, value: any) => {
    setConfig((prev: any) => ({
      ...prev,
      heroBanner: { ...prev.heroBanner, [field]: value }
    }));
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string, isHero: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    toast.loading('Uploading...', { id: 'upload' });
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = await getToken();
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      
      if (data.url) {
        if (isHero) {
          updateHeroField(field, data.url);
        } else {
          updateConfigField(field, data.url);
        }
        toast.success('Upload complete', { id: 'upload' });
      } else {
        toast.error(data.error || 'Upload failed', { id: 'upload' });
      }
    } catch(err) {
      toast.error('Upload failed', { id: 'upload' });
    }
  };

  if (isLoading) return <div className="p-4 sm:p-10">Loading settings...</div>;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FDFCFB]">
      <header className="px-4 sm:px-10 py-4 sm:py-6 border-b border-[#E5E5E1] bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="font-serif text-2xl text-[#333]">Store Customization</h2>
          <p className="text-sm text-gray-500 mt-1">Design your storefront exactly how you want it.</p>
        </div>
        <button 
          onClick={() => updateConfig.mutate(config)}
          disabled={updateConfig.isPending}
          className="flex items-center gap-2 bg-[#6B705C] text-white px-6 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-[#6B705C]/20 hover:bg-[#5a5e4d] transition-all disabled:opacity-50"
        >
          {updateConfig.isPending ? 'Saving...' : <><Check size={18} /> Save Changes</>}
        </button>
      </header>

      <div className="flex gap-6 px-4 sm:px-10 py-4 border-b border-[#E5E5E1] bg-white shrink-0">
        <button 
          onClick={() => setActiveTab('theme')} 
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'theme' ? 'border-[#6B705C] text-[#6B705C]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <Palette size={16} /> Theme & Colors
        </button>
        <button 
          onClick={() => setActiveTab('content')} 
          className={`flex items-center gap-2 pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'content' ? 'border-[#6B705C] text-[#6B705C]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
        >
          <LayoutIcon size={16} /> Layout & Content
        </button>
      </div>

      <StoreSettingsForm 
        activeTab={activeTab} 
        config={config} 
        handleUpload={handleUpload} 
        updateConfigField={updateConfigField} 
        updateHeroField={updateHeroField} 
      />
    </div>
  );
}