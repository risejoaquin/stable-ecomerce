import React from 'react';

export const ColorPicker = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      <div className="flex gap-4 items-center">
        <input 
          type="color" 
          value={value || '#000000'} 
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-12 rounded cursor-pointer border border-[#E5E5E1] p-1 bg-white" 
        />
        <input 
          type="text" 
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-sm border border-gray-300 rounded px-3 py-1.5 w-28 font-mono"
        />
      </div>
    </div>
  );
};
