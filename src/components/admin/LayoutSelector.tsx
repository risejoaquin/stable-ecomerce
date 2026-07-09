import React from 'react';
import { Layout as LayoutIcon } from 'lucide-react';

export const LayoutSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const layouts = [
    { id: 'grid', label: 'Grid', desc: 'Standard product grid' },
    { id: 'list', label: 'List', desc: 'Vertical list of products' },
    { id: 'hero', label: 'Hero Banner', desc: 'Big banner + product grid' },
  ];

  return (
    <div>
      <div className="flex gap-4">
        {layouts.map(layout => (
          <label key={layout.id} className={`flex-1 cursor-pointer border rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${value === layout.id ? 'border-[#6B705C] bg-[#6B705C]/5' : 'border-gray-200 hover:border-gray-300'}`}>
            <input 
              type="radio" 
              name="layout" 
              value={layout.id}
              checked={value === layout.id}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <LayoutIcon size={24} className={value === layout.id ? 'text-[#6B705C]' : 'text-gray-400'} />
            <span className={`text-sm font-bold ${value === layout.id ? 'text-[#6B705C]' : 'text-gray-700'}`}>{layout.label}</span>
            <span className="text-[10px] text-gray-500 text-center">{layout.desc}</span>
          </label>
        ))}
      </div>
    </div>
  );
};
