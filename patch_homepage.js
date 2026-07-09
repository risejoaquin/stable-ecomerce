import fs from 'fs';

let code = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf-8');

// Imports
code = code.replace(
  "import { useProducts } from '../../hooks/useProducts';",
  "import { useSearchProducts } from '../../hooks/useSearchProducts';\nimport { SearchBar } from '../../components/storefront/SearchBar';\nimport { ProductFilters } from '../../components/storefront/ProductFilters';\nimport { Pagination } from '../../components/storefront/Pagination';\nimport { SEO } from '../../components/SEO';"
);

// State and hook usage
const hookUsageRegex = /const \{ data: products, isLoading: isProductsLoading \} = useProducts\(store\?\.slug\);/;
const newHookUsage = `
  const [filters, setFilters] = React.useState({ search: '', minPrice: '', maxPrice: '', sortBy: 'created_at', order: 'desc', page: 1, pageSize: 12 });
  const { data: searchResult, isLoading: isProductsLoading } = useSearchProducts(store?.slug, filters);
`;
code = code.replace(hookUsageRegex, newHookUsage);

// currentProducts assignment
code = code.replace(
  "const currentProducts = products || [];",
  "const currentProducts = searchResult?.data || [];\n  const totalPages = searchResult ? Math.ceil(searchResult.total / searchResult.pageSize) : 1;"
);

// Add SEO and split layout
const returnRegex = /return \(\s*<div className="min-h-screen flex flex-col"/;
code = code.replace(
  returnRegex,
  `return (\n    <div className="min-h-screen flex flex-col"\n    <SEO title={currentStore.name} description={currentStore.description} />`
);

// Fix the SEO insertion to not break the div opening
code = code.replace(
  /<div className="min-h-screen flex flex-col"\s*<SEO title=\{currentStore\.name\} description=\{currentStore\.description\} \/>/,
  `<SEO title={currentStore.name} description={currentStore.description} />\n    <div className="min-h-screen flex flex-col"`
);

// Replace Main Content area
const mainContentRegex = /<main className="flex-1 p-8 max-w-7xl mx-auto w-full">([\s\S]*?)<\/main>/;

const newMainContent = `
      <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
        {(!config.heroBanner?.image && layout !== 'hero') && (
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight" style={{ color: textColor }}>{config.heroBanner?.title || 'New Arrivals'}</h1>
            <p className="text-lg opacity-70" style={{ color: secondaryColor }}>{config.heroBanner?.subtitle || 'Explore our latest collection.'}</p>
          </div>
        )}
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-6">
            <SearchBar onSearch={(search) => setFilters(prev => ({ ...prev, search, page: 1 }))} />
            <ProductFilters filters={filters} setFilters={(f) => { setFilters(f); setFilters(prev => ({...prev, page: 1})); }} />
          </div>
          
          <div className="flex-1 w-full">
            {isProductsLoading ? (
              <div className="py-20 text-center opacity-50">Loading products...</div>
            ) : (
              <>
                <div className={\`grid gap-8 \${layout === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3'}\`}>
                  {currentProducts.map((p: any) => (
                    <StyledProductCard key={p.id} product={p} config={config} themeColor={themeColor} textColor={textColor} />
                  ))}
                </div>
                {currentProducts.length === 0 && (
                  <div className="text-center py-20 opacity-50">No products found.</div>
                )}
                <Pagination page={filters.page} totalPages={totalPages} setPage={(page) => setFilters(prev => ({ ...prev, page }))} themeColor={themeColor} />
              </>
            )}
          </div>
        </div>
      </main>
`;
code = code.replace(mainContentRegex, newMainContent.trim());

fs.writeFileSync('src/pages/store/HomePage.tsx', code);
