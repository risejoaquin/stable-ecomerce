import React from 'react';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { LayoutSelector } from './LayoutSelector';
import { ShapeSelector } from './ShapeSelector';
import { Upload, Image as ImageIcon, Sparkles, LayoutTemplate, Type, Palette, SquareDashed } from 'lucide-react';

export const StoreSettingsForm = ({ activeTab, config, handleUpload, updateConfigField, updateHeroField }: any) => {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--color-background)] p-4 sm:p-10">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">
        {activeTab === 'theme' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {/* Colors Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg text-[var(--color-primary)]">
                  <Palette size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[var(--color-text)]">Colores de la Marca</h3>
                  <p className="text-sm text-gray-500 mt-1">Define la identidad visual de tu tienda a través de los colores.</p>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <ColorPicker label="Color Principal" desc="Botones principales y estados activos" value={config.themeColor} onChange={(val: string) => updateConfigField('themeColor', val)} />
                  <ColorPicker label="Acento Secundario" desc="Bordes sutiles y estados al pasar el cursor" value={config.secondaryColor} onChange={(val: string) => updateConfigField('secondaryColor', val)} />
                  <ColorPicker label="Fondo de la Tienda" desc="Fondo principal de la página" value={config.backgroundColor} onChange={(val: string) => updateConfigField('backgroundColor', val)} />
                  <ColorPicker label="Color del Encabezado" desc="Fondo de la barra de navegación superior" value={config.headerColor} onChange={(val: string) => updateConfigField('headerColor', val)} />
                  <ColorPicker label="Color del Texto Principal" desc="Encabezados y cuerpo principales" value={config.textColor} onChange={(val: string) => updateConfigField('textColor', val)} />
                  <ColorPicker label="Texto de Botones" desc="Color del texto dentro de los botones" value={config.buttonColor} onChange={(val: string) => updateConfigField('buttonColor', val)} />
                </div>
              </div>
            </section>

            {/* Tipografía Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg text-[var(--color-primary)]">
                  <Type size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[var(--color-text)]">Tipografía</h3>
                  <p className="text-sm text-gray-500 mt-1">Selecciona la fuente que represente la voz de tu marca.</p>
                </div>
              </div>
              <div className="p-6">
                <FontSelector value={config.fontFamily} onChange={(val: string) => updateConfigField('fontFamily', val)} />
              </div>
            </section>

            {/* Formas Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg text-[var(--color-primary)]">
                  <SquareDashed size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[var(--color-text)]">Formas y Estilo</h3>
                  <p className="text-sm text-gray-500 mt-1">Configura el redondeo de los botones, tarjetas y otros elementos.</p>
                </div>
              </div>
              <div className="p-6">
                <ShapeSelector value={config.borderRadius} onChange={(val: string) => updateConfigField('borderRadius', val)} />
              </div>
            </section>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            
            {/* Recursos de Marca Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg text-[var(--color-primary)]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[var(--color-text)]">Recursos de Marca</h3>
                  <p className="text-sm text-gray-500 mt-1">Sube tu logo y favicon para un aspecto profesional.</p>
                </div>
              </div>
              <div className="p-6 space-y-8">
                {/* Logo */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Logo de la Tienda</label>
                    <p className="text-xs text-gray-500 mb-4">Se muestra en el encabezado. Tamaño recomendado: 200x50px, PNG transparente.</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E1] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                      <Upload size={16} className="text-gray-400" />
                      <span>Elegir Archivo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'logoUrl')} />
                    </label>
                  </div>
                  <div className="w-full sm:w-64 h-24 bg-[var(--color-background)] rounded-xl border border-[#E5E5E1] border-dashed flex items-center justify-center p-4 relative overflow-hidden group">
                    {config.logoUrl ? (
                      <>
                        <img src={config.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                        <button onClick={() => updateConfigField('logoUrl', '')} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-medium transition-opacity">Eliminar</button>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 flex flex-col items-center gap-1">
                        <ImageIcon size={20} className="opacity-50" />
                        <span className="text-xs">Sin logo</span>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-[#E5E5E1]" />

                {/* Favicon */}
                <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Favicon del Navegador</label>
                    <p className="text-xs text-gray-500 mb-4">Icono pequeño en las pestañas. Tamaño recomendado: 32x32px.</p>
                    <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E1] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                      <Upload size={16} className="text-gray-400" />
                      <span>Elegir Archivo</span>
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'faviconUrl')} />
                    </label>
                  </div>
                  <div className="w-full sm:w-64 h-24 bg-[var(--color-background)] rounded-xl border border-[#E5E5E1] border-dashed flex items-center justify-center p-4 relative overflow-hidden group">
                    {config.faviconUrl ? (
                      <>
                        <img src={config.faviconUrl} alt="Favicon Preview" className="w-10 h-10 object-contain rounded-md shadow-sm bg-white" />
                        <button onClick={() => updateConfigField('faviconUrl', '')} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-medium transition-opacity">Eliminar</button>
                      </>
                    ) : (
                      <div className="text-center text-gray-400 flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded border border-[#E5E5E1] border-dashed mb-1" />
                        <span className="text-xs">Sin favicon</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <hr className="border-[#E5E5E1]" />

                {/* Footer Text */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Texto de Derechos de Autor del Pie de Página</label>
                  <p className="text-xs text-gray-500 mb-3">Aparece en la parte inferior de todas las páginas de la tienda.</p>
                  <input 
                    type="text" 
                    placeholder="© 2024 My Store. All rights reserved."
                    value={config.footerText || ''}
                    onChange={(e) => updateConfigField('footerText', e.target.value)}
                    className="w-full max-w-md border border-[#E5E5E1] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none transition-shadow bg-[var(--color-background)]"
                  />
                </div>
              </div>
            </section>

            {/* Layout Section */}
            <section className="bg-white rounded-2xl shadow-sm border border-[#E5E5E1] overflow-hidden">
              <div className="border-b border-[#E5E5E1] p-6 flex items-center gap-3">
                <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg text-[var(--color-primary)]">
                  <LayoutTemplate size={20} />
                </div>
                <div>
                  <h3 className="font-serif text-xl text-[var(--color-text)]">Diseño de la Tienda</h3>
                  <p className="text-sm text-gray-500 mt-1">Elige cómo se muestran tus productos en la página principal.</p>
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
                    <h3 className="font-serif text-xl text-[var(--color-text)]">Detalles del Banner Principal</h3>
                    <p className="text-sm text-gray-500 mt-1">Personaliza el gran banner de bienvenida en tu tienda.</p>
                  </div>
                </div>
                <div className="p-6 space-y-6">
                  {/* Banner Image */}
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex-1">
                      <label className="block text-sm font-bold text-gray-700 mb-1">Fondo del Banner</label>
                      <p className="text-xs text-gray-500 mb-4">Imagen de alta resolución. Recomendado: 1920x600px.</p>
                      <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E5E1] rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors shadow-sm">
                        <Upload size={16} className="text-gray-400" />
                        <span>Subir Imagen</span>
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpload(e, 'image', true)} />
                      </label>
                    </div>
                    <div className="w-full sm:w-2/3 h-40 bg-[var(--color-background)] rounded-xl border border-[#E5E5E1] overflow-hidden relative group">
                      {config.heroBanner?.image ? (
                        <>
                          <img src={config.heroBanner.image} alt="Hero bg" className="absolute inset-0 w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <button onClick={() => updateHeroField('image', '')} className="text-white text-sm font-medium bg-black/50 px-3 py-1.5 rounded-lg hover:bg-black/70">Eliminar</button>
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                          <ImageIcon size={32} className="opacity-30 mb-2" />
                          <span className="text-sm">Sin imagen de banner</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <hr className="border-[#E5E5E1]" />

                  {/* Banner Text */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Título Principal</label>
                      <p className="text-xs text-gray-500 mb-3">El texto grande del encabezado.</p>
                      <input 
                        type="text" 
                        placeholder="Welcome to our store"
                        value={config.heroBanner?.title || ''}
                        onChange={(e) => updateHeroField('title', e.target.value)}
                        className="w-full border border-[#E5E5E1] bg-[var(--color-background)] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none transition-shadow"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-1">Subtítulo</label>
                      <p className="text-xs text-gray-500 mb-3">Texto más pequeño debajo del título.</p>
                      <input 
                        type="text" 
                        placeholder="Discover our new collection"
                        value={config.heroBanner?.subtitle || ''}
                        onChange={(e) => updateHeroField('subtitle', e.target.value)}
                        className="w-full border border-[#E5E5E1] bg-[var(--color-background)] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none transition-shadow"
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
