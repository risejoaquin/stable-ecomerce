import fs from 'fs';
let content = fs.readFileSync('src/components/storefront/ProductFilters.tsx', 'utf8');

const newFilters = `    <div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-6">
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
        <h3 className="font-bold text-sm mb-3">Ordenar Por</h3>`;

content = content.replace(
  `<div className="bg-white p-6 rounded-2xl border border-gray-100 flex flex-col gap-6">
      <div>
        <h3 className="font-bold text-sm mb-3">Sort By</h3>`,
  newFilters
);

// also let's translate "Sort By" and "Price Range" to Spanish
content = content.replace(`Sort By`, `Ordenar Por`);
content = content.replace(`Price Range`, `Rango de Precios`);
content = content.replace(`Newest First`, `Más Recientes`);
content = content.replace(`Price: Low to High`, `Precio: Menor a Mayor`);
content = content.replace(`Price: High to Low`, `Precio: Mayor a Menor`);

fs.writeFileSync('src/components/storefront/ProductFilters.tsx', content);
