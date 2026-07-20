import fs from 'fs';
let content = fs.readFileSync('src/components/admin/ProductFormModal.tsx', 'utf8');

content = content.replace(
  "const [category, setCategory] = useState(product?.category || '');",
  "const [category, setCategory] = useState(product?.category || '');\n  const [subcategory, setSubcategory] = useState(product?.subcategory || '');"
);

const saveCall = "onClick={() => saveProduct.mutate({ name, description, price, stock, status, images, brand, category, variants })}";
const newSaveCall = "onClick={() => saveProduct.mutate({ name, description, price, stock, status, images, brand, category, subcategory, variants })}";
content = content.replace(saveCall, newSaveCall);

const categoryInput = `                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded px-3 py-2" 
                  value={category} onChange={e => setCategory(e.target.value)} 
                />`;

const replaceInput = categoryInput + `
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Subcategoría</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-200 rounded px-3 py-2" 
                  value={subcategory} onChange={e => setSubcategory(e.target.value)} 
                />`;

content = content.replace(categoryInput, replaceInput);

fs.writeFileSync('src/components/admin/ProductFormModal.tsx', content);
