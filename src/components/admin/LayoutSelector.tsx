import React from 'react';
import { Layout as LayoutIcon, LayoutList, Image as ImageIcon } from 'lucide-react';

export const LayoutSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const layouts = [
    { id: 'grid', label: 'Cuadrícula', desc: 'Cuadrícula estándar de productos', icon: LayoutIcon },
    { id: 'list', label: 'Lista', desc: 'Lista vertical de productos', icon: LayoutList },
    { id: 'hero', label: 'Banner Principal', desc: 'Big banner + product grid', icon: ImageIcon },
  ];

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {layouts.map(layout => {
          const Icon = layout.icon;
          return (
            <label key={layout.id} className={`cursor-pointer border-2 rounded-xl p-5 flex flex-col items-center gap-3 transition-all ${value === layout.id ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-sm' : 'border-[#E5E5E1] bg-white hover:border-gray-300'}`}>
              <input 
                type="radio" 
                name="layout" 
                value={layout.id}
                checked={value === layout.id}
                onChange={(e) => onChange(e.target.value)}
                className="sr-only"
              />
              <div className={`p-3 rounded-full ${value === layout.id ? 'bg-[var(--color-primary)] text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}>
                <Icon size={24} />
              </div>
              <div className="text-center">
                <span className={`block text-sm font-bold ${value === layout.id ? 'text-gray-900' : 'text-gray-700'}`}>{layout.label}</span>
                <span className="block text-[11px] text-gray-500 mt-1">{layout.desc}</span>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  );
};
