import React from 'react';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { LayoutSelector } from './LayoutSelector';
import { Upload } from 'lucide-react';

export const StoreSettingsForm = ({ activeTab, config, handleUpload, updateConfigField, updateHeroField }: any) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-10">
      {activeTab === 'theme' && (
        <div className="max-w-2xl space-y-10">
          <section>
            <h3 className="font-medium text-lg mb-6 border-b pb-2">Colors</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <ColorPicker label="Primary Brand Color" value={config.themeColor} onChange={(val) => updateConfigField('themeColor', val)} />
              <ColorPicker label="Secondary Accent Color" value={config.secondaryColor} onChange={(val) => updateConfigField('secondaryColor', val)} />
              <ColorPicker label="Store Background" value={config.backgroundColor} onChange={(val) => updateConfigField('backgroundColor', val)} />
              <ColorPicker label="Main Text Color" value={config.textColor} onChange={(val) => updateConfigField('textColor', val)} />
              <ColorPicker label="Button Color" value={config.buttonColor} onChange={(val) => updateConfigField('buttonColor', val)} />
            </div>
          </section>

          <section>
            <h3 className="font-medium text-lg mb-6 border-b pb-2">Typography</h3>
            <FontSelector value={config.fontFamily} onChange={(val) => updateConfigField('fontFamily', val)} />
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
            <LayoutSelector value={config.layout} onChange={(val) => updateConfigField('layout', val)} />
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
  );
};
