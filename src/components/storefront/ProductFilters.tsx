import React from 'react';

export function ProductFilters({ filters, setFilters }: { filters: any, setFilters: any }) {
  
  return (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-6">
      <div>
        <h3 className="font-bold text-sm mb-3">Categorías</h3>
        <select 
          value={filters.category || 'all'}
          onChange={(e) => setFilters((prev: any) => ({ ...prev, category: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B705C]"
        >
          <option value="all">Todas</option>
          <option value="Categoria 1">Categoria 1</option>
          <option value="Categoria 2">Categoria 2</option>
        </select>
      </div>
      <div>
        <h3 className="font-bold text-sm mb-3">Subcategorías</h3>
        <select 
          value={filters.subcategory || 'all'}
          onChange={(e) => setFilters((prev: any) => ({ ...prev, subcategory: e.target.value }))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B705C]"
        >
          <option value="all">Todas</option>
          <option value="Subcategoria A">Subcategoria A</option>
          <option value="Subcategoria B">Subcategoria B</option>
        </select>
      </div>
      <div>
        <h3 className="font-bold text-sm mb-3">Ordenar Por</h3>
        <select 
          value={`${filters.sortBy}-${filters.order}`}
          onChange={(e) => {
            const [sortBy, order] = e.target.value.split('-');
            setFilters((prev: any) => ({ ...prev, sortBy, order }));
          }}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B705C]"
        >
          <option value="created_at-desc">Más Recientes</option>
          <option value="price-asc">Precio: Menor a Mayor</option>
          <option value="price-desc">Precio: Mayor a Menor</option>
        </select>
      </div>

      <div>
        <h3 className="font-bold text-sm mb-3">Rango de Precios</h3>
        <div className="flex gap-2 items-center">
          <input 
            type="number" 
            placeholder="Mín" 
            value={filters.minPrice || ''}
            onChange={(e) => setFilters((prev: any) => ({ ...prev, minPrice: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
          <span className="text-gray-400">-</span>
          <input 
            type="number" 
            placeholder="Máx" 
            value={filters.maxPrice || ''}
            onChange={(e) => setFilters((prev: any) => ({ ...prev, maxPrice: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
