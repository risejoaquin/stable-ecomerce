import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, setPage }: { page: number, totalPages: number, setPage: (p: number) => void, themeColor?: string }) {
  if (totalPages <= 1) return null;

  return (
    <nav className="uix-pagination" aria-label="Paginación del catálogo">
      <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} type="button" aria-label="Página anterior">
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      {Array.from({ length: totalPages }).map((_, i) => (
        <button key={i} onClick={() => setPage(i + 1)} className={page === i + 1 ? 'is-active' : ''} type="button" aria-current={page === i + 1 ? 'page' : undefined} aria-label={`Ir a la página ${i + 1}`}>
          {i + 1}
        </button>
      ))}
      <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} type="button" aria-label="Página siguiente">
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </nav>
  );
}
