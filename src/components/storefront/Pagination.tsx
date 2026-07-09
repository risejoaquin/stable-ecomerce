import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, setPage, themeColor }: { page: number, totalPages: number, setPage: (p: number) => void, themeColor: string }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-12">
      <button 
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors"
      >
        <ChevronLeft size={18} />
      </button>
      
      {Array.from({ length: totalPages }).map((_, i) => (
        <button
          key={i}
          onClick={() => setPage(i + 1)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-colors ${page === i + 1 ? 'text-white' : 'border border-gray-200 hover:bg-gray-50'}`}
          style={{ backgroundColor: page === i + 1 ? themeColor : 'transparent' }}
        >
          {i + 1}
        </button>
      ))}

      <button 
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50 transition-colors"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
