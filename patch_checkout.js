import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const oldCheck = `      for (const item of items) {
        const { data: product } = await supabase.from('products').select('*').eq('id', item.productId).single();
        if (!product) throw new Error(\`Product \${item.productId} not found\`);`;

const newCheck = `      for (const item of items) {
        let actualProductId = item.productId;
        const uuidMatch = actualProductId.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
        if (uuidMatch) {
          actualProductId = uuidMatch[1];
        }

        const { data: product } = await supabase.from('products').select('*').eq('id', actualProductId).single();
        if (!product) throw new Error(\`Product \${item.productId} not found\`);`;

content = content.replace(oldCheck, newCheck);

fs.writeFileSync('server.ts', content);

console.log('Fixed checkout actualProductId');
