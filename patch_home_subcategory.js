import fs from 'fs';
let content = fs.readFileSync('src/pages/store/HomePage.tsx', 'utf8');

const categoryBlock = `          {product.category && (
            <>
              {product.brand && <span className="text-gray-300 text-[10px]">•</span>}
              <span className="text-[10px] text-gray-400">{product.category}</span>
            </>
          )}`;

const newBlock = categoryBlock + `
          {product.subcategory && (
            <>
              {(product.brand || product.category) && <span className="text-gray-300 text-[10px]">•</span>}
              <span className="text-[10px] text-gray-400">{product.subcategory}</span>
            </>
          )}`;

content = content.replace(categoryBlock, newBlock);
fs.writeFileSync('src/pages/store/HomePage.tsx', content);
