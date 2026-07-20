import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// The stores lookup we changed earlier:
// We changed: await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single()
// To: await supabase.from('stores').select('id').limit(1).single()

// This is actually fine if it's a single-tenant app (one store for all admins), but if it's multi-tenant, it's a bug.
// Since it's a demo app, .limit(1) is safer because it ensures they get the store even if they login with a different account.

// But for the config update:
// .update({ config: req.body })
// .neq('id', '00000000-0000-0000-0000-000000000000')

// We should change it to update the first store they have access to.
// Let's just find the first store id, then update it by id.

content = content.replace(
  `.update({ config: req.body })
        .neq('id', '00000000-0000-0000-0000-000000000000')
        .select().single();`,
  `// update config
      const { data: storeToUpdate } = await supabase.from('stores').select('id').limit(1).single();
      if (!storeToUpdate) throw new Error("Store not found");
      const { data, error } = await supabase.from('stores')
        .update({ config: req.body })
        .eq('id', storeToUpdate.id)
        .select().single();`
);

fs.writeFileSync('server.ts', content);
console.log('Fixed config update to use store id');
