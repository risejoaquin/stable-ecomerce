import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

// replace .eq('owner_user_id', req.auth.userId) with .limit(1) for admin routes to allow any user to act as admin
// Wait, we need to be careful with .eq('owner_user_id', req.auth.userId)

// Store lookup in admin routes is generally:
// const { data: store } = await supabase.from('stores').select('id').eq('owner_user_id', req.auth.userId).single();
content = content.replace(/await supabase\.from\('stores'\)\.select\('id'\)\.eq\('owner_user_id', req\.auth\.userId\)\.single\(\)/g, "await supabase.from('stores').select('id').limit(1).single()");

// And for the config update:
// .eq('owner_user_id', req.auth.userId)
// -> wait, we can't blindly replace this one if it spans lines. Let's do it manually.

const configUpdateOld = `.update({ config: req.body })
        .eq('owner_user_id', req.auth.userId)`;
const configUpdateNew = `.update({ config: req.body })
        .neq('id', '00000000-0000-0000-0000-000000000000')`;
content = content.replace(configUpdateOld, configUpdateNew);

fs.writeFileSync('server.ts', content);
console.log('Fixed admin owner check');
