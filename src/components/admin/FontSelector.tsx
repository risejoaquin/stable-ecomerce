import React from 'react';

export const FontSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">Google Font Family</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-sm border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-[#6B705C] focus:outline-none"
      >
        <option value="Inter">Inter (Clean & Modern)</option>
        <option value="Roboto">Roboto (Standard)</option>
        <option value="Lora">Lora (Elegant Serif)</option>
        <option value="Playfair Display">Playfair Display (Premium Serif)</option>
        <option value="Space Grotesk">Space Grotesk (Tech & Bold)</option>
      </select>
      <div className="mt-4 p-4 border rounded-lg bg-gray-50" style={{ fontFamily: value === 'Playfair Display' ? '"Playfair Display", serif' : value === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : value === 'Lora' ? '"Lora", serif' : value === 'Roboto' ? '"Roboto", sans-serif' : '"Inter", sans-serif' }}>
        <p className="text-xl">The quick brown fox jumps over the lazy dog.</p>
        <p className="text-sm mt-2 opacity-70">1234567890 !@#$%^&*()</p>
      </div>
    </div>
  );
};
