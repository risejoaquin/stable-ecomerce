import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const oldCheck = `        if (!product) throw new Error(\`Product \${item.productId} not found\`);
        if (product.stock < item.quantity) throw new Error(\`Not enough stock for \${product.name}\`);`;

const newCheck = `        if (!product) throw new Error(\`Product \${item.productId} not found\`);
        
        let stockToCheck = product.stock;
        if (product.variants && Array.isArray(product.variants) && item.name) {
           const variantMatch = product.variants.find(v => item.name.includes(v.name));
           if (variantMatch) {
             stockToCheck = variantMatch.stock;
           }
        }
        
        if (stockToCheck < item.quantity) throw new Error(\`Not enough stock for \${item.name || product.name}\`);`;

content = content.replace(oldCheck, newCheck);

fs.writeFileSync('server.ts', content);

console.log('Fixed checkout stock logic');
