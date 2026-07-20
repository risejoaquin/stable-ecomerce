import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf8');

const oldStr = `      const { data, error } = await supabase.from('stores')
        // update config
      const { data: storeToUpdate } = await supabase.from('stores').select('id').limit(1).single();`;

const newStr = `      // update config
      const { data: storeToUpdate } = await supabase.from('stores').select('id').limit(1).single();`;

content = content.replace(oldStr, newStr);

fs.writeFileSync('server.ts', content);
console.log('Fixed redeclaration in server.ts');
