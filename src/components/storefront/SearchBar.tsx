import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export function SearchBar({ onSearch, placeholder = 'Buscar productos...', initialValue = '' }: { onSearch: (s: string) => void, placeholder?: string, initialValue?: string }) {
  const [term, setTerm] = useState(initialValue);

  useEffect(() => {
    setTerm(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => onSearch(term), 500);
    return () => clearTimeout(handler);
  }, [term, onSearch]);

  return (
    <label className="uix-store-search">
      <span className="sr-only">Buscar productos</span>
      <Search size={18} aria-hidden="true" />
      <input type="search" value={term} onChange={(e) => setTerm(e.target.value)} placeholder={placeholder} autoComplete="off" />
      {term && <button type="button" onClick={() => setTerm('')} aria-label="Limpiar búsqueda"><X size={16} /></button>}
    </label>
  );
}
