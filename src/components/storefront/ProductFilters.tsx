import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

export function ProductFilters({ filters, setFilters, categories = [], onReset }: { filters: any, setFilters: any, categories?: any[], onReset?: () => void }) {
  return (
    <div className="uix-product-filters">
      <div className="uix-product-filters__head"><SlidersHorizontal size={17} /><span>Filtrar catálogo</span></div>
      <label>
        <span>Categoría</span>
        <select value={filters.category || 'all'} onChange={(e) => setFilters((prev: any) => ({ ...prev, category: e.target.value }))}>
          <option value="all">Todas</option>
          {categories.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </label>
      <label>
        <span>Ordenar por</span>
        <select value={`${filters.sortBy}-${filters.order}`} onChange={(e) => {
          const [sortBy, order] = e.target.value.split('-');
          setFilters((prev: any) => ({ ...prev, sortBy, order }));
        }}>
          <option value="created_at-desc">Más recientes</option>
          <option value="price-asc">Precio: menor a mayor</option>
          <option value="price-desc">Precio: mayor a menor</option>
        </select>
      </label>
      <fieldset>
        <legend>Rango de precios</legend>
        <div className="uix-price-range">
          <input type="number" inputMode="decimal" min="0" placeholder="Mín" aria-label="Precio mínimo" value={filters.minPrice || ''} onChange={(e) => setFilters((prev: any) => ({ ...prev, minPrice: e.target.value }))} />
          <span>—</span>
          <input type="number" inputMode="decimal" min="0" placeholder="Máx" aria-label="Precio máximo" value={filters.maxPrice || ''} onChange={(e) => setFilters((prev: any) => ({ ...prev, maxPrice: e.target.value }))} />
        </div>
      </fieldset>
      {onReset && <button type="button" className="uix-action-secondary uix-filter-reset" onClick={onReset}>Limpiar filtros</button>}
    </div>
  );
}
