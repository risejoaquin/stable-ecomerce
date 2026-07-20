import fs from 'fs';

const storeSettingsCode = `import React from 'react';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { LayoutSelector } from './LayoutSelector';
import { Upload, Image as ImageIcon, Sparkles, LayoutTemplate, Type, Palette } from 'lucide-react';

export const StoreSettingsForm = ({ activeTab, config, handleUpload, updateConfigField, updateHeroField }: any) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[#FDFCFB] p-4 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        {activeTab === 'theme' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {/* Colors Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[#6B705C]/10 rounded-lg text-[#6B705C]">
                  <Palette size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[#333]">Brand Colors</h3>
                  <p className="text-sm text-gray-500 mt-1">Define your store's visual identity through colors.</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <ColorPicker label="Primary Brand Color" desc="Main buttons & active states" value={config.themeColor} onChange={(val: string) => updateConfigField('themeColor', val)} />
                  <ColorPicker label="Secondary Accent" desc="Subtle borders & hover states" value={config.secondaryColor} onChange={(val: string) => updateConfigField('secondaryColor', val)} />
                  <ColorPicker label="Store Background" desc="Main page background" value={config.backgroundColor} onChange={(val: string) => updateConfigField('backgroundColor', val)} />
                  <ColorPicker label="Main Text Color" desc="Primary headings and body" value={config.textColor} onChange={(val: string) => updateConfigField('textColor', val)} />
                  <ColorPicker label="Button Text" desc="Text color inside buttons" value={config.buttonColor} onChange={(val: string) => updateConfigField('buttonColor', val)} />
                </div>
              </div>
            </section>

            {/* Typography Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[#6B705C]/10 rounded-lg text-[#6B705C]">
                  <Type size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[#333]">Typography</h3>
                  <p className="text-sm text-gray-500 mt-1">Select the font family that represents your brand voice.</p>
                </div>
              </div>
              <div className="p-6">
                <FontSelector value={config.fontFamily} onChange={(val: string) => updateConfigField('fontFamily', val)} />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {/* Branding Assets Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[#6B705C]/10 rounded-lg text-[#6B705C]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[#333]">Branding Assets</h3>
                  <p className="text-sm text-gray-500 mt-1">Upload your logo and favicon for a professional look.</p>
                </div>
              </div>
              <div className="p-6 space-y-8">
                {/* Logo */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Store Logo</label>
                    <p className="text-xs text-gray-500 mb-4">Displays in the header. Recommended size: 200x50px, transparent PNG.</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E1] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                      <Upload size={16} className="text-gray-400" />
                      <span>Choose File</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'logoUrl')} />
                    </label>
                  </div>
                  <div className="w-full sm:w-64 h-24 bg-[#FDFCFB] rounded-xl border border-[#E5E5E1] border-dashed flex items-center justify-center p-4 relative overflow-hidden group">
                    {config.logoUrl ? (
                      <>
                        <img src={config.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                        <button onClick={() => updateConfigField('logoUrl', '')} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-medium transition-opacity">Remove</button>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 flex flex-col items-center gap-1">
                        <ImageIcon size={20} className="opacity-50" />
                        <span className="text-xs">No logo</span>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-[#E5E5E1]" />

                {/* Favicon */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Browser Favicon</label>
                    <p className="text-xs text-gray-500 mb-4">Small icon shown in browser tabs. Recommended size: 32x32px.</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E1] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                      <Upload size={16} className="text-gray-400" />
                      <span>Choose File</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'faviconUrl')} />
                    </label>
                  </div>
                  <div className="w-full sm:w-64 h-24 bg-[#FDFCFB] rounded-xl border border-[#E5E5E1] border-dashed flex items-center justify-center p-4 relative overflow-hidden group">
                    {config.faviconUrl ? (
                      <>
                        <img src={config.faviconUrl} alt="Favicon Preview" className="w-10 h-10 object-contain rounded-md shadow-sm bg-white" />
                        <button onClick={() => updateConfigField('faviconUrl', '')} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-medium transition-opacity">Remove</button>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded border border-[#E5E5E1] border-dashed mb-1" />
                        <span className="text-xs">No favicon</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <hr className="border-[#E5E5E1]" />

                {/* Footer Text */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Footer Copyright Text</label>
                  <p className="text-xs text-gray-500 mb-3">Appears at the bottom of all store pages.</p>
                  <input 
                    type="text" 
                    placeholder="© 2024 My Store. All rights reserved."
                    value={config.footerText || ''}
                    onChange={(e) => updateConfigField('footerText', e.target.value)}
                    className="w-full max-w-md border border-[#E5E5E1] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6B705C] focus:border-[#6B705C] focus:outline-none transition-shadow bg-[#FDFCFB]"
                  />
                </div>
              </div>
            </section>

            {/* Layout Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[#6B705C]/10 rounded-lg text-[#6B705C]">
                  <LayoutTemplate size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[#333]">Store Layout</h3>
                  <p className="text-sm text-gray-500 mt-1">Choose how your products are displayed on the home page.</p>
                </div>
              </div>
              <div className="p-6">
                <LayoutSelector value={config.layout} onChange={(val: string) => updateConfigField('layout', val)} />
              </div>
            </section>

            {/* Hero Banner Section (Conditional) */}
            {config.layout === 'hero' && (
              <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="border-b border-[#E5E5E1] p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif text-xl text-[#333]">Hero Banner Details</h3>
                    <p className="text-sm text-gray-500 mt-1">Customize the large welcoming banner at the top of your store.</p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Banner Image */}
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Banner Background</label>
                      <p className="text-xs text-gray-500 mb-4">High-resolution image. Recommended: 1920x600px.</p>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E1] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                        <Upload size={16} className="text-gray-400" />
                        <span>Upload Image</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'image', true)} />
                      </label>
                    </div>
                    <div className="w-full sm:w-2/3 h-40 bg-[#FDFCFB] rounded-xl border border-[#E5E5E1] overflow-hidden relative group">
                      {config.heroBanner?.image ? (
                        <>
                          <img src={config.heroBanner.image} alt="Hero bg" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <button onClick={() => updateHeroField('image', '')} className="text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg hover:bg-black/70">Remove</button>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={32} className="opacity-30 mb-2" />
                          <span className="text-sm">No banner image</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-[#E5E5E1]" />

                  {/* Banner Text */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Main Title</label>
                      <p className="text-xs text-gray-500 mb-3">The large headline text.</p>
                      <input 
                        type="text" 
                        placeholder="Welcome to our store"
                        value={config.heroBanner?.title || ''}
                        onChange={(e) => updateHeroField('title', e.target.value)}
                        className="w-full border border-[#E5E5E1] bg-[#FDFCFB] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6B705C] focus:border-[#6B705C] focus:outline-none transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Subtitle</label>
                      <p className="text-xs text-gray-500 mb-3">Smaller text below the title.</p>
                      <input 
                        type="text" 
                        placeholder="Discover our new collection"
                        value={config.heroBanner?.subtitle || ''}
                        onChange={(e) => updateHeroField('subtitle', e.target.value)}
                        className="w-full border border-[#E5E5E1] bg-[#FDFCFB] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6B705C] focus:border-[#6B705C] focus:outline-none transition-shadow"
                      />
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/admin/StoreSettingsForm.tsx', storeSettingsCode);

const colorPickerCode = `import React from 'react';

export const ColorPicker = ({ label, desc, value, onChange }: { label: string, desc?: string, value: string, onChange: (val: string) => void }) => {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="block text-sm font-bold text-gray-700">{label}</label>
        {desc && <p className="text-[11px] text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <div className="flex gap-3 items-center mt-1">
        <div className="relative">
          <input 
             type="color" 
             value={value || '#000000'} 
             onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0 bg-transparent opacity-0 absolute inset-0 z-10" 
           />
           <div className="w-10 h-10 rounded-lg border shadow-inner pointer-events-none" style={{ backgroundColor: value || '#000000', borderColor: 'rgba(0,0,0,0.1)' }} />
        </div>
        <input 
           type="text" 
           value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm border border-[#E5E5E1] rounded-lg px-3 py-2 w-24 font-mono uppercase bg-[#FDFCFB] focus:ring-2 focus:ring-[#6B705C] focus:border-[#6B705C] focus:outline-none transition-shadow"
        />
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/admin/ColorPicker.tsx', colorPickerCode);

const fontSelectorCode = `import React from 'react';

export const FontSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">Google Font Family</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-sm border border-[#E5E5E1] bg-[#FDFCFB] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none transition-shadow"
      >
        <option value="Inter">Inter (Clean & Modern)</option>
        <option value="Roboto">Roboto (Standard)</option>
        <option value="Lora">Lora (Elegant Serif)</option>
        <option value="Playfair Display">Playfair Display (Premium Serif)</option>
        <option value="Space Grotesk">Space Grotesk (Tech & Bold)</option>
      </select>
      <div className="mt-6 p-8 border border-[#E5E5E1] rounded-xl bg-[#FDFCFB] shadow-inner" style={{ fontFamily: value === 'Playfair Display' ? '"Playfair Display", serif' : value === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : value === 'Lora' ? '"Lora", serif' : value === 'Roboto' ? '"Roboto", sans-serif' : '"Inter", sans-serif' }}>
        <p className="text-2xl text-gray-900 leading-tight">Design is thinking made visual.</p>
        <p className="text-base mt-4 text-gray-600">Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed.</p>
        <div className="flex gap-4 mt-6">
           <button className="px-6 py-2 bg-[#6B705C] text-white rounded-lg text-sm font-medium">Primary Action</button>
           <button className="px-6 py-2 border border-[#E5E5E1] text-gray-700 rounded-lg text-sm font-medium">Secondary</button>
        </div>
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/admin/FontSelector.tsx', fontSelectorCode);

const layoutSelectorCode = `import React from 'react';
import { Layout as LayoutIcon, LayoutList, Image as ImageIcon } from 'lucide-react';

export const LayoutSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const layouts = [
    { id: 'grid', label: 'Grid', desc: 'Standard product grid', icon: LayoutIcon },
    { id: 'list', label: 'List', desc: 'Vertical list of products', icon: LayoutList },
    { id: 'hero', label: 'Hero Banner', desc: 'Big banner + product grid', icon: ImageIcon },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {layouts.map(layout => {
          const Icon = layout.icon;
          return (
            <label key={layout.id} className={\`cursor-pointer border-2 rounded-xl p-5 flex flex-col items-center gap-3 transition-all \${value === layout.id ? 'border-[#6B705C] bg-[#6B705C]/5 shadow-sm' : 'border-[#E5E5E1] bg-white hover:border-gray-300'}\`}>
              <input 
                type="radio" 
                name="layout" 
                value={layout.id}
                checked={value === layout.id}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              <div className={\`p-3 rounded-full \${value === layout.id ? 'bg-[#6B705C] text-white shadow-md' : 'bg-gray-100 text-gray-500'}\`}>
                <Icon size={24} />
              </div>
              <div className="text-center">
                <span className={\`block text-sm font-bold \${value === layout.id ? 'text-gray-900' : 'text-gray-700'}\`}>{layout.label}</span>
                <span className="block text-[11px] text-gray-500 mt-1">{layout.desc}</span>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  );
};
`;

fs.writeFileSync('src/components/admin/LayoutSelector.tsx', layoutSelectorCode);

console.log('Done redesigning settings');
