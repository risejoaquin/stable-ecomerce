import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const oldCheck1 = `            // Fetch current product to safely decrement stock
            const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
            if (product && typeof product.stock === 'number') {
              const newStock = Math.max(0, product.stock - item.quantity);
              await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
            }`;

const newCheck1 = `            // Fetch current product to safely decrement stock
            const { data: product } = await supabase.from('products').select('stock, variants').eq('id', item.product_id).single();
            if (product && typeof product.stock === 'number') {
              const newStock = Math.max(0, product.stock - item.quantity);
              
              let newVariants = product.variants;
              if (newVariants && Array.isArray(newVariants) && item.name) {
                const variantMatch = newVariants.find(v => item.name.includes(v.name));
                if (variantMatch) {
                   variantMatch.stock = Math.max(0, variantMatch.stock - item.quantity);
                }
              }
              
              await supabase.from('products').update({ stock: newStock, variants: newVariants }).eq('id', item.product_id);
            }`;

content = content.replace(oldCheck1, newCheck1);

fs.writeFileSync('server.ts', content);

console.log('Fixed stock update');
