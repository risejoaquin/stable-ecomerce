import fs from 'fs';
let content = fs.readFileSync('src/components/storefront/ProductFilters.tsx', 'utf8');

const categoryBlock = `      <div>
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
      </div>`;

const replaceWith = categoryBlock + `
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
      </div>`;

content = content.replace(categoryBlock, replaceWith);
fs.writeFileSync('src/components/storefront/ProductFilters.tsx', content);
