import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

export function SearchBar({ onSearch, placeholder = 'Search products...' }: { onSearch: (s: string) => void, placeholder?: string }) {
  const [term, setTerm] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(term);
    }, 500);
    return () => clearTimeout(handler);
  }, [term, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
      <input 
        type="text" 
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#6B705C] transition-all"
      />
    </div>
  );
}
