import fs from 'fs';
let content = fs.readFileSync('src/components/admin/ProductFormModal.tsx', 'utf8');

const categoryBlock = `              <div>
                <label className="block text-xs font-bold text-[#A5A58D] mb-1">Category</label>
                <input 
                  className="w-full bg-[#FDFCFB] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#6B705C]" 
                  value={category} onChange={e => setCategory(e.target.value)} 
                  placeholder="E.g. Clothing"
                />
              </div>`;

const replaceBlock = categoryBlock + `
              <div>
                <label className="block text-xs font-bold text-[#A5A58D] mb-1">Subcategoría</label>
                <input 
                  className="w-full bg-[#FDFCFB] border border-[#E5E5E1] rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-[#6B705C]" 
                  value={subcategory} onChange={e => setSubcategory(e.target.value)} 
                  placeholder="E.g. Shirts"
                />
              </div>`;

content = content.replace(categoryBlock, replaceBlock);
fs.writeFileSync('src/components/admin/ProductFormModal.tsx', content);
