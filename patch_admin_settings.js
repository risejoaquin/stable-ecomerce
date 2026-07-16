import fs from 'fs';

let code = `
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { toast } from 'react-hot-toast';
import { Check, Image as ImageIcon, Layout as LayoutIcon, Type, Palette, Monitor, Upload } from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';

export function AdminSettingsPage() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  
  const { data: store, isLoading } = useQuery({
    queryKey: ['public-store'], // we can use public store or admin store
    queryFn: () => apiClient.get('/public/store'),
  });

  const updateConfig = useMutation({
    mutationFn: (config: any) => apiClient.put('/admin/store/config', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-store'] });
      toast.success('Settings saved successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save settings');
    }
  });

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
    if (store?.store?.config) {
      setConfig((prev: any) => ({ ...prev, ...store.store.config }));
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
        headers: token ? { 'Authorization': \`Bearer \${token}\` } : {},
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

  if (isLoading) return <div className="p-10">Loading settings...</div>;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#FDFCFB]">
      <header className="px-10 py-6 border-b border-[#E5E5E1] bg-white flex justify-between items-center shrink-0">
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

      <div className="flex-1 overflow-y-auto p-10">
        <div className="flex gap-4 border-b border-[#E5E5E1] mb-10 pb-4">
          <button 
            onClick={() => setActiveTab('theme')}
            className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors \${activeTab === 'theme' ? 'bg-[#6B705C] text-white' : 'text-gray-500 hover:bg-gray-100'}\`}
          >
            <Palette size={18} /> Theme & Colors
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors \${activeTab === 'content' ? 'bg-[#6B705C] text-white' : 'text-gray-500 hover:bg-gray-100'}\`}
          >
            <LayoutIcon size={18} /> Content & Layout
          </button>
        </div>

        {activeTab === 'theme' && (
          <div className="max-w-2xl space-y-10">
            <section>
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Colors</h3>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { key: 'themeColor', label: 'Primary Brand Color' },
                  { key: 'secondaryColor', label: 'Secondary Accent Color' },
                  { key: 'backgroundColor', label: 'Store Background' },
                  { key: 'textColor', label: 'Main Text Color' },
                  { key: 'buttonColor', label: 'Button Color' }
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-sm font-bold text-gray-700 mb-2">{item.label}</label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="color" 
                        value={config[item.key] || '#000000'} 
                        onChange={(e) => updateConfigField(item.key, e.target.value)}
                        className="w-12 h-12 rounded cursor-pointer border border-[#E5E5E1] p-1 bg-white" 
                      />
                      <input 
                        type="text" 
                        value={config[item.key] || ''}
                        onChange={(e) => updateConfigField(item.key, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-3 py-1.5 w-28 font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Typography</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Google Font Family</label>
                  <select 
                    value={config.fontFamily}
                    onChange={(e) => updateConfigField('fontFamily', e.target.value)}
                    className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  >
                    <option value="Inter">Inter (Clean & Modern)</option>
                    <option value="Roboto">Roboto (Standard)</option>
                    <option value="Lora">Lora (Elegant Serif)</option>
                    <option value="Playfair Display">Playfair Display (Premium Serif)</option>
                    <option value="Space Grotesk">Space Grotesk (Tech & Bold)</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="max-w-2xl space-y-10">
            <section>
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Branding Assets</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Store Logo</label>
                  <div className="flex items-center gap-4">
                    {config.logoUrl ? (
                       <img src={config.logoUrl} alt="Logo Preview" className="h-12 max-w-xs object-contain" />
                    ) : (
                       <div className="h-12 w-32 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">No Logo</div>
                    )}
                    <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                       <Upload size={16} /> Upload Logo
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'logoUrl')} />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Favicon</label>
                  <div className="flex items-center gap-4">
                    {config.faviconUrl ? (
                       <img src={config.faviconUrl} alt="Favicon Preview" className="w-8 h-8 object-contain" />
                    ) : (
                       <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">Fav</div>
                    )}
                    <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                       <Upload size={16} /> Upload Favicon
                       <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'faviconUrl')} />
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Footer Copyright Text</label>
                  <input 
                    type="text" 
                    placeholder="© 2024 My Store. All rights reserved."
                    value={config.footerText || ''}
                    onChange={(e) => updateConfigField('footerText', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Home Layout Structure</h3>
              <div>
                <div className="flex gap-4">
                  {[
                    { id: 'grid', label: 'Grid', desc: 'Standard product grid' },
                    { id: 'list', label: 'List', desc: 'Vertical list of products' },
                    { id: 'hero', label: 'Hero Banner', desc: 'Big banner + product grid' },
                  ].map(layout => (
                    <label key={layout.id} className={\`flex-1 cursor-pointer border rounded-xl p-4 flex flex-col items-center gap-2 transition-all \${config.layout === layout.id ? 'border-[#6B705C] bg-[#6B705C]/5' : 'border-gray-200 hover:border-gray-300'}\`}>
                      <input 
                        type="radio" 
                        name="layout" 
                        value={layout.id}
                        checked={config.layout === layout.id}
                        onChange={(e) => updateConfigField('layout', e.target.value)}
                        className="sr-only"
                      />
                      <LayoutIcon size={24} className={config.layout === layout.id ? 'text-[#6B705C]' : 'text-gray-400'} />
                      <span className={\`text-sm font-bold \${config.layout === layout.id ? 'text-[#6B705C]' : 'text-gray-700'}\`}>{layout.label}</span>
                      <span className="text-[10px] text-gray-500 text-center">{layout.desc}</span>
                    </label>
                  ))}
                </div>
              </div>
            </section>

            {config.layout === 'hero' && (
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h3 className="font-medium text-lg mb-6 border-b pb-2">Hero Banner Details</h3>
                <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Banner Background Image</label>
                    <div className="flex items-center gap-4">
                      {config.heroBanner?.image ? (
                        <div className="h-20 w-40 bg-gray-200 rounded overflow-hidden relative">
                          <img src={config.heroBanner.image} alt="Hero bg" className="absolute inset-0 w-full h-full object-cover" />
                        </div>
                      ) : null}
                      <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
                         <Upload size={16} /> {config.heroBanner?.image ? 'Change Image' : 'Upload Image'}
                         <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'image', true)} />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Banner Title</label>
                    <input 
                      type="text" 
                      placeholder="Welcome to our store"
                      value={config.heroBanner?.title || ''}
                      onChange={(e) => updateHeroField('title', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Banner Subtitle</label>
                    <input 
                      type="text" 
                      placeholder="Discover our new collection"
                      value={config.heroBanner?.subtitle || ''}
                      onChange={(e) => updateHeroField('subtitle', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                    />
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/admin/AdminSettingsPage.tsx', code);
