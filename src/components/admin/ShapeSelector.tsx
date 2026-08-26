import React from 'react';

export const ShapeSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  const options = [
    { id: 'none', name: 'Cuadrado', radius: '0px' },
    { id: 'sm', name: 'Sutil', radius: '0.25rem' },
    { id: 'md', name: 'Medio', radius: '0.5rem' },
    { id: 'lg', name: 'Redondeado', radius: '1rem' },
    { id: 'full', name: 'Píldora', radius: '9999px' },
  ];

  return (
    <div className="space-y-4">
      <label className="block text-sm font-bold text-gray-700">Redondeo de Elementos (Bordes)</label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className={`flex flex-col items-center p-4 border-2 transition-all ${value === opt.id || (!value && opt.id === 'md') ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[#E5E5E1] bg-white hover:border-gray-300'}`}
            style={{ borderRadius: opt.radius }}
          >
            <div 
              className="w-full h-8 bg-[var(--color-primary)] opacity-50 mb-2" 
              style={{ borderRadius: opt.radius === '9999px' ? '9999px' : opt.radius }}
            />
            <span className="text-xs font-medium text-gray-700">{opt.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
