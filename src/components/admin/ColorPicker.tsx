import React from 'react';

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
          className="text-sm border border-[#E5E5E1] rounded-lg px-3 py-2 w-24 font-mono uppercase bg-[var(--color-background)] focus:ring-2 focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] focus:outline-none transition-shadow"
        />
      </div>
    </div>
  );
};
