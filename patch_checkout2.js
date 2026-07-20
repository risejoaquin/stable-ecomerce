import fs from 'fs';

// Update useCheckout.ts
let useCheckout = fs.readFileSync('src/hooks/useCheckout.ts', 'utf8');
useCheckout = useCheckout.replace(
  "items: items.map(i => ({ productId: i.productId || i.id, quantity: i.quantity }))",
  "items: items.map(i => ({ productId: i.productId || i.id, quantity: i.quantity, name: i.name }))"
);
fs.writeFileSync('src/hooks/useCheckout.ts', useCheckout);

// Update server.ts
let content = fs.readFileSync('server.ts', 'utf8');

const oldCheck = `        orderItems.push({
          product_id: product.id,
          quantity: item.quantity,
          unit_price: product.price,
          name: product.name 
        });`;

const newCheck = `        orderItems.push({
          product_id: product.id,
          quantity: item.quantity,
          unit_price: product.price,
          name: item.name || product.name 
        });`;

content = content.replace(oldCheck, newCheck);

fs.writeFileSync('server.ts', content);

console.log('Fixed checkout names');
