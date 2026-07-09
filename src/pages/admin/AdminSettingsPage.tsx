import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '../../api/useApiClient';
import { toast } from 'react-hot-toast';
import { Check, Image as ImageIcon, Layout as LayoutIcon, Type, Palette, Monitor } from 'lucide-react';

export function AdminSettingsPage() {
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['admin-store'],
    queryFn: () => apiClient.get('/admin/store'),
  });

  const updateConfig = useMutation({
    mutationFn: (config: any) => apiClient.put('/admin/store/config', config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-store'] });
      toast.success('Settings saved successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save settings');
    }
  });

  const [activeTab, setActiveTab] = useState<'theme' | 'content'>('theme');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  const [config, setConfig] = useState<any>({
    themeColor: '#6B705C',
    secondaryColor: '#A5A58D',
    backgroundColor: '#FDFCFB',
    textColor: '#333333',
    fontFamily: 'Inter',
    borderRadius: 'xl',
    logoUrl: '',
    faviconUrl: '',
    footerText: '',
    heroBanner: {
      image: '',
      title: 'Welcome',
      subtitle: 'Discover our collection'
    },
    layout: 'grid'
  });

  useEffect(() => {
    if (data?.store?.config) {
      setConfig({ ...config, ...data.store.config });
    }
  }, [data]);

  if (isLoading) return <div className="p-10">Loading settings...</div>;

  const handleSave = () => {
    updateConfig.mutate(config);
  };

  const updateConfigField = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, [key]: value }));
  };
  
  const updateHeroField = (key: string, value: any) => {
    setConfig((prev: any) => ({ ...prev, heroBanner: { ...prev.heroBanner, [key]: value } }));
  };

  if (isPreviewMode) {
    return (
      <div className="flex flex-col h-full bg-gray-100">
        <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <Monitor size={18} />
            <span>Store Preview</span>
          </div>
          <button 
            onClick={() => setIsPreviewMode(false)}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
          >
            Exit Preview
          </button>
        </div>
        <div className="flex-1 p-8 overflow-auto flex justify-center">
          <div className="w-full max-w-5xl bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-300 flex flex-col" style={{ minHeight: '800px' }}>
            {/* Mock Browser Header */}
            <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="mx-4 flex-1 h-6 bg-white rounded border border-gray-200 flex items-center px-3 text-xs text-gray-400 font-mono">
                myshop.com
              </div>
            </div>
            {/* Preview Content */}
            <div className="flex-1 overflow-auto relative pointer-events-none" style={{
              backgroundColor: config.backgroundColor,
              color: config.textColor,
              fontFamily: config.fontFamily === 'Playfair Display' ? '"Playfair Display", serif' : 
                          config.fontFamily === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : 
                          '"Inter", sans-serif'
            }}>
              {/* Header */}
              <header className="h-20 px-8 flex items-center justify-between border-b" style={{ borderColor: config.secondaryColor + '40' }}>
                <span className="text-2xl font-bold" style={{ color: config.themeColor }}>
                  {config.logoUrl ? <img src={config.logoUrl} alt="Logo" className="h-8" /> : data?.store?.name || 'My Store'}
                </span>
                <div className="w-10 h-10 rounded-full border flex items-center justify-center" style={{ borderColor: config.secondaryColor + '40' }}>
                  <span className="material-symbols-outlined text-sm" style={{ color: config.themeColor }}>shopping_bag</span>
                </div>
              </header>
              
              {/* Hero Banner */}
              {(config.layout === 'hero' || config.heroBanner?.image) && (
                <div className="relative h-[400px] flex items-center justify-center text-center p-8 bg-gray-100"
                     style={{
                       backgroundImage: config.heroBanner?.image ? `url(${config.heroBanner.image})` : 'none',
                       backgroundSize: 'cover',
                       backgroundPosition: 'center',
                     }}>
                  <div className="absolute inset-0 bg-black/40"></div>
                  <div className="relative z-10 text-white max-w-2xl">
                    <h1 className="text-5xl font-bold mb-4">{config.heroBanner?.title || 'Welcome'}</h1>
                    <p className="text-xl opacity-90">{config.heroBanner?.subtitle || 'Discover our collection'}</p>
                  </div>
                </div>
              )}

              {/* Main Content */}
              <div className="p-8 max-w-7xl mx-auto">
                <h2 className="text-3xl mb-8" style={{ color: config.textColor }}>New Arrivals</h2>
                
                <div className={`grid gap-8 ${config.layout === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}>
                  {[1,2,3,4].map(i => (
                    <div key={i} className="bg-white overflow-hidden flex flex-col" style={{
                      borderRadius: config.borderRadius === 'none' ? '0' : config.borderRadius === 'sm' ? '0.25rem' : config.borderRadius === 'md' ? '0.5rem' : config.borderRadius === 'lg' ? '1rem' : config.borderRadius === 'xl' ? '1.5rem' : '2rem',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
                    }}>
                      <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-300">
                        <ImageIcon size={48} />
                      </div>
                      <div className="p-4 flex flex-col gap-2">
                        <h3 className="font-bold text-lg">Product Name</h3>
                        <p className="opacity-70 text-sm">A wonderful product description goes here.</p>
                        <p className="font-medium mt-2" style={{ color: config.themeColor }}>$99.99</p>
                        <button className="w-full py-2 mt-2 text-white text-sm font-medium transition-opacity" style={{ 
                          backgroundColor: config.themeColor,
                          borderRadius: config.borderRadius === 'none' ? '0' : config.borderRadius === 'sm' ? '0.125rem' : config.borderRadius === 'md' ? '0.25rem' : '0.5rem'
                        }}>
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Footer */}
              <footer className="mt-20 py-8 text-center border-t text-sm" style={{ borderColor: config.secondaryColor + '40', color: config.secondaryColor }}>
                {config.footerText || `© ${new Date().getFullYear()} ${data?.store?.name || 'Store'}`}
              </footer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 flex flex-col gap-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-[#333]">Store Settings</h2>
          <p className="text-gray-500 text-sm mt-1">Customize your public storefront.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsPreviewMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Monitor size={16} /> Preview
          </button>
          <button 
            onClick={handleSave}
            disabled={updateConfig.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium hover:bg-[#5a5e4d] transition-colors disabled:opacity-50"
          >
            <Check size={16} /> {updateConfig.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-white p-1 rounded-xl border border-[#E5E5E1] w-fit">
        <button 
          onClick={() => setActiveTab('theme')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'theme' ? 'bg-[#6B705C] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Palette size={16} /> Theme & Colors
        </button>
        <button 
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'content' ? 'bg-[#6B705C] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          <Type size={16} /> Content & Layout
        </button>
      </div>

      <div className="bg-white rounded-[24px] border border-[#E5E5E1] p-8 flex-1 overflow-auto">
        
        {activeTab === 'theme' && (
          <div className="max-w-2xl space-y-10">
            <section>
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Colors</h3>
              <div className="grid grid-cols-2 gap-6">
                {[
                  { key: 'themeColor', label: 'Primary Theme Color' },
                  { key: 'secondaryColor', label: 'Secondary Color' },
                  { key: 'backgroundColor', label: 'Background Color' },
                  { key: 'textColor', label: 'Text Color' }
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
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Typography & Style</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Font Family</label>
                  <select 
                    value={config.fontFamily}
                    onChange={(e) => updateConfigField('fontFamily', e.target.value)}
                    className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  >
                    <option value="Inter">Inter (Sans Serif)</option>
                    <option value="Playfair Display">Playfair Display (Serif)</option>
                    <option value="Space Grotesk">Space Grotesk (Modern)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Component Border Radius</label>
                  <select 
                    value={config.borderRadius}
                    onChange={(e) => updateConfigField('borderRadius', e.target.value)}
                    className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  >
                    <option value="none">Square (0px)</option>
                    <option value="sm">Small (4px)</option>
                    <option value="md">Medium (8px)</option>
                    <option value="lg">Large (16px)</option>
                    <option value="xl">Extra Large (24px)</option>
                    <option value="full">Fully Rounded (Pill)</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="max-w-2xl space-y-10">
            <section>
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Branding</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Logo URL</label>
                  <input 
                    type="text" 
                    placeholder="https://example.com/logo.png"
                    value={config.logoUrl || ''}
                    onChange={(e) => updateConfigField('logoUrl', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty to use store name as text logo.</p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Footer Text</label>
                  <input 
                    type="text" 
                    placeholder="© 2024 My Store"
                    value={config.footerText || ''}
                    onChange={(e) => updateConfigField('footerText', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Hero Banner</h3>
              <div className="space-y-6 bg-gray-50 p-6 rounded-xl border border-gray-100">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Banner Image URL</label>
                  <input 
                    type="text" 
                    placeholder="https://images.unsplash.com/..."
                    value={config.heroBanner?.image || ''}
                    onChange={(e) => updateHeroField('image', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Banner Title</label>
                  <input 
                    type="text" 
                    value={config.heroBanner?.title || ''}
                    onChange={(e) => updateHeroField('title', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Banner Subtitle</label>
                  <input 
                    type="text" 
                    value={config.heroBanner?.subtitle || ''}
                    onChange={(e) => updateHeroField('subtitle', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
                  />
                </div>
              </div>
            </section>
            
            <section>
              <h3 className="font-medium text-lg mb-6 border-b pb-2">Layout Settings</h3>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">Product Grid Style</label>
                <div className="flex gap-4">
                  {[
                    { id: 'grid', label: 'Grid View' },
                    { id: 'list', label: 'List View' },
                    { id: 'hero', label: 'Hero Featured' },
                  ].map(layout => (
                    <label key={layout.id} className={`flex-1 cursor-pointer border rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${config.layout === layout.id ? 'border-[#6B705C] bg-[#6B705C]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <input 
                        type="radio" 
                        name="layout" 
                        value={layout.id}
                        checked={config.layout === layout.id}
                        onChange={(e) => updateConfigField('layout', e.target.value)}
                        className="sr-only"
                      />
                      <LayoutIcon size={24} className={config.layout === layout.id ? 'text-[#6B705C]' : 'text-gray-400'} />
                      <span className={`text-sm font-medium ${config.layout === layout.id ? 'text-[#6B705C]' : 'text-gray-600'}`}>{layout.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
