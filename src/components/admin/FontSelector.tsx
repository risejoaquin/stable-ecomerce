import React from 'react';

export const FontSelector = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">Familia de Fuentes de Google</label>
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-sm border border-[#E5E5E1] bg-[var(--color-background)] rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none transition-shadow"
      >
        <option value="Inter">Inter (Limpia y Moderna)</option>
        <option value="Roboto">Roboto (Estándar)</option>
        <option value="Lora">Lora (Serif Elegante)</option>
        <option value="Playfair Display">Playfair Display (Serif Premium)</option>
        <option value="Space Grotesk">Space Grotesk (Tecnológica y Audaz)</option>
      </select>
      <div className="mt-6 p-8 border border-[#E5E5E1] rounded-xl bg-[var(--color-background)] shadow-inner" style={{ fontFamily: value === 'Playfair Display' ? '"Playfair Display", serif' : value === 'Space Grotesk' ? '"Space Grotesk", sans-serif' : value === 'Lora' ? '"Lora", serif' : value === 'Roboto' ? '"Roboto", sans-serif' : '"Inter", sans-serif' }}>
        <p className="text-2xl text-gray-900 leading-tight">El diseño es pensamiento hecho visual.</p>
        <p className="text-base mt-4 text-gray-600">La tipografía es el arte y técnica de organizar las letras para hacer el lenguaje escrito legible y atractivo.</p>
        <div className="flex gap-4 mt-6">
           <button className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium">Acción Principal</button>
           <button className="px-6 py-2 border border-[#E5E5E1] text-gray-700 rounded-lg text-sm font-medium">Secundaria</button>
        </div>
      </div>
    </div>
  );
};
