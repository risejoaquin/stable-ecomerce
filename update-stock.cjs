const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');
const oldStockLogic = `              // Decrement stock
              const { data: orderItems } = await supabase.from('order_items').select('*, products(*)').eq('order_id', orderId);
              if (orderItems && orderItems.length > 0) {
                for (const item of orderItems) {
                  // Fetch current product to safely decrement stock
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
                  }
                }
              }`;

const newStockLogic = `              // Decrement stock using RPC to avoid race conditions
              const { data: orderItems } = await supabase.from('order_items').select('*, products(*)').eq('order_id', orderId);
              if (orderItems && orderItems.length > 0) {
                for (const item of orderItems) {
                  await supabase.rpc('decrement_stock', { 
                    product_id: item.product_id, 
                    quantity: item.quantity 
                  });
                }
              }`;

content = content.replace(oldStockLogic, newStockLogic);
fs.writeFileSync('server.ts', content);
