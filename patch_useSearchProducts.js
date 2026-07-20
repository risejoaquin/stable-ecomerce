import fs from 'fs';
let content = fs.readFileSync('src/hooks/useSearchProducts.ts', 'utf8');

const oldParams = `      if (filters?.search) params.append('search', filters.search);
      if (filters?.minPrice) params.append('min_price', filters.minPrice);
      if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice); // Wait, need to check how it was exactly`;

// I will just replace the whole function to be safe.
