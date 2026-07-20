import fs from 'fs';
let content = fs.readFileSync('src/pages/store/ProductDetailPage.tsx', 'utf8');

const categoryBlock = `                {product.category && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm" style={{ color: secondaryColor }}>{product.category}</span>
                  </>
                )}`;

const newBlock = categoryBlock + `
                {product.subcategory && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-sm" style={{ color: secondaryColor }}>{product.subcategory}</span>
                  </>
                )}`;

content = content.replace(categoryBlock, newBlock);
fs.writeFileSync('src/pages/store/ProductDetailPage.tsx', content);
